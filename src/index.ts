#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import open from 'open';
import { startMCPServer } from './mcp/server';
import { apiFacade } from './http/facade';
import { Server as WebServer } from './http/server';
import { getReagentVersion } from './version';
import type { GetSessionResponse } from '@src/models/api';

const program = new Command();

let webServer: WebServer | null = null;
let isCleaningUp = false;
const DEFAULT_PORT = 3636;

function resolvePort(portOption?: string): number {
  if (!portOption) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(portOption, 10);
  if (Number.isNaN(port)) {
    throw new Error('Invalid port provided');
  }

  return port;
}

function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;

  console.error('\n[Reagent] Shutting down...');

  if (!webServer) {
    process.exit(0);
  }

  const timeout = setTimeout(() => {
    console.error('[Reagent] Force exit after timeout');
    process.exit(0);
  }, 5000);

  webServer.stop()
    .then(() => {
      clearTimeout(timeout);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Reagent] Failed to stop web server:', error);
      clearTimeout(timeout);
      process.exit(1);
    });
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

program
  .name('reagent')
  .description('Reagent: MCP server for local code reviews with GitHub-style UI')
  .version(getReagentVersion());

function spawnServerInBackground(port: number): void {
  console.error('[Reagent] Web server not running. Starting...');
  const child = spawn(
    process.argv[0],
    [process.argv[1], 'start', '--detach', '--port', port.toString()],
    {
      detached: true,
      stdio: 'ignore',
    }
  );
  child.unref();
}

async function ensureServerRunning(): Promise<void> {
  const isHealthy = await apiFacade.isHealthy();

  if (isHealthy) {
    return;
  }

  spawnServerInBackground(DEFAULT_PORT);
}

program
  .command('mcp')
  .description('Start the MCP server (stdio)')
  .action(async () => {
    try {
      process.stdin.on('end', cleanup);
      await ensureServerRunning();
      await startMCPServer();
    } catch (error: unknown) {
      console.error('[Reagent] Failed to start MCP server:', error);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the ReAgent Web Server')
  .option('-p, --port <number>', 'Port to run on', DEFAULT_PORT.toString())
  .option('-d, --detach', 'Run in the background (daemon mode)')
  .action(async (options) => {
    if (options.detach) {
      const args = process.argv.slice(2).filter((arg) => arg !== '-d' && arg !== '--detach');

      const child = spawn(process.argv[0], [process.argv[1], ...args], {
        detached: true,
        stdio: 'ignore',
      });

      child.unref();
      console.error(`[Reagent] Server started in background (PID: ${child.pid})`);
      process.exit(0);
    }

    try {
      const port = resolvePort(options.port);

      const server = new WebServer();
      await server.start(port);
      webServer = server;
    } catch (error: unknown) {
      console.error('[Reagent] Failed to start web server:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List active review sessions')
  .action(async () => {
    try {
      const sessions = await apiFacade.get<Array<{
        id: string;
        status: string;
        filesCount: number;
        title?: string;
        createdAt: string;
      }>>('/sessions');

      if (sessions.length === 0) {
        console.log('No active review sessions found.');
        return;
      }

      console.table(
        sessions.map((s: any) => ({
          ID: s.id,
          Status: s.status,
          Files: s.filesCount,
          Title: s.title || '(no title)',
          Created: new Date(s.createdAt).toLocaleString(),
        }))
      );
    } catch (error: unknown) {
      console.error('[Reagent] Failed to list sessions. Is the server running?');
      process.exit(1);
    }
  });

program
  .command('review [files...]')
  .description('Create a new review session')
  .option('-s, --source <type>', 'Review source (uncommitted, commit, branch, local)', 'uncommitted')
  .option('--base <ref>', 'Base ref for branch comparison')
  .option('--head <ref>', 'Head ref for branch comparison')
  .option('--commit <hash>', 'Commit hash for commit review')
  .option('--title <string>', 'Review title')
  .option('--description <string>', 'Review description')
  .option('--no-open', 'Do not open the browser automatically')
  .action(async (files, options) => {
    const body = {
      source: options.source,
      files: files.length > 0 ? files : undefined,
      base: options.base,
      head: options.head,
      commitHash: options.commit,
      title: options.title,
      description: options.description,
      workingDirectory: process.cwd(),
    };

    try {
      const result = await apiFacade.post<{
        reviewUrl: string;
      }>('/reviews', body);
      console.log(`[Reagent] Review created: ${result.reviewUrl}`);

      const shouldOpenBrowser = options.open !== false;
      if (shouldOpenBrowser) {
        console.error(`[Reagent] Opening browser: ${result.reviewUrl}`);
        try {
          await open(result.reviewUrl);
        } catch (browserError) {
          console.error('[Reagent] Failed to open browser:', browserError);
          console.error('[Reagent] You can manually open the review at:', result.reviewUrl);
        }
        return;
      }

      console.error('[Reagent] Browser opening disabled (--no-open). Access review at:', result.reviewUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Reagent] Failed to create review:', message);
      process.exit(1);
    }
  });

program
  .command('get <sessionId>')
  .description('Get review status and results')
  .option('--wait', 'Wait for the review to complete')
  .option('--json', 'Output result as JSON')
  .action(async (sessionId, options) => {
    try {
      let session;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          session = await apiFacade.get<GetSessionResponse>(`/sessions/${sessionId}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          if (message.includes('404')) {
            console.error('[Reagent] Session not found.');
            process.exit(1);
          }

          console.error(`[Reagent] Failed to fetch session: ${message}`);
          process.exit(1);
        }

        if (!options.wait || session.status !== 'pending') {
          break;
        }

        await new Promise((r) => setTimeout(r, 1000));
      }

      if (options.json) {
        console.log(JSON.stringify(session, null, 2));
        return;
      }

      console.log(`Review Status: ${session.status}`);

      if (session.status === 'pending') {
        console.log('Review is still in progress.');
        return;
      }

      console.log(`\nGeneral Feedback:\n${session.generalFeedback || '(none)'}`);
      console.log(`\nComments (${session.comments.length}):`);
      session.comments.forEach((c: { filePath: string; startLine: number; endLine: number; text: string }) => {
        const lineInfo = c.startLine === c.endLine
          ? `${c.startLine}`
          : `${c.startLine}-${c.endLine}`;
        console.log(`- ${c.filePath}:${lineInfo}: ${c.text}`);
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Reagent] Error:', message);
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Stop the running Reagent web server')
  .option('--force', 'Force stop the server')
  .action(async (options) => {
    try {
      const server = new WebServer();
      const result = await server.stopRunningProcess(Boolean(options.force));

      if (result === 'not_running') {
        console.log('[Reagent] No running server found.');
        return;
      }

      console.log('[Reagent] Server stopped.');
    } catch (error: unknown) {
      console.error('[Reagent] Failed to stop server:', error);
      process.exit(1);
    }
  });

program.parse();
