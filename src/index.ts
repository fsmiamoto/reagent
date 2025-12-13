#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import { Server } from 'http';
import open from 'open';
import { startMCPServer } from './mcp/server.js';
import { startWebServer } from './web/server.js';
import { sessionStore } from './core/SessionStore.js';
import { ensureServerRunning } from './web/lifecycle.js';
import { DEFAULT_PORT, getPort } from './config.js';

const program = new Command();

let webServer: Server | null = null;
let isCleaningUp = false;

function resolvePort(portOption?: string): number {
  if (!portOption || portOption === DEFAULT_PORT.toString()) {
    return getPort();
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
    sessionStore.clear();
    process.exit(0);
  }

  const timeout = setTimeout(() => {
    console.error('[Reagent] Force exit after timeout');
    process.exit(0);
  }, 5000);

  webServer.close(() => {
    clearTimeout(timeout);
    sessionStore.clear();
    process.exit(0);
  });
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

program
  .name('reagent')
  .description('Reagent: MCP server for local code reviews with GitHub-style UI')
  .version('0.0.9');

program
  .command('mcp')
  .description('Start the MCP server (stdio)')
  .action(async () => {
    try {
      process.stdin.on('end', cleanup);
      await startMCPServer();
    } catch (error) {
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
      return;
    }

    try {
      const port = resolvePort(options.port);

      const { server } = await startWebServer(port);
      webServer = server;

      setInterval(() => {
        const cleaned = sessionStore.cleanupOldSessions();
        if (cleaned > 0) {
          console.error(`[Reagent] Cleaned up ${cleaned} old session(s)`);
        }
      }, 60 * 60 * 1000);
    } catch (error) {
      console.error('[Reagent] Failed to start web server:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List active review sessions')
  .option('-p, --port <number>', 'Port to connect to', DEFAULT_PORT.toString())
  .action(async (options) => {
    try {
      const port = resolvePort(options.port);
      const response = await fetch(`http://localhost:${port}/api/sessions`);

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }

      const sessions = (await response.json()) as any[];

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
    } catch (error) {
      console.error('[Reagent] Failed to list sessions. Is the server running?');
      process.exit(1);
    }
  });

program
  .command('review [files...]')
  .description('Create a new review session')
  .option('-s, --source <type>', 'Review source (uncommitted, commit, branch, local)', 'uncommitted')
  .option('-p, --port <number>', 'Port to connect to', DEFAULT_PORT.toString())
  .option('--base <ref>', 'Base ref for branch comparison')
  .option('--head <ref>', 'Head ref for branch comparison')
  .option('--commit <hash>', 'Commit hash for commit review')
  .option('--title <string>', 'Review title')
  .option('--description <string>', 'Review description')
  .option('--no-open', 'Do not open the browser automatically')
  .option('--auto-start', 'Start the server if it is not running')
  .action(async (files, options) => {
    const port = resolvePort(options.port);
    const apiUrl = `http://localhost:${port}/api`;

    if (options.autoStart) {
      await ensureServerRunning(port);
    } else {
      try {
        const res = await fetch(`${apiUrl}/health`);
        if (!res.ok) throw new Error();
      } catch (e) {
        console.error('[Reagent] Server is not running. Use --auto-start or run "reagent start" first.');
        process.exit(1);
      }
    }

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
      const response = await fetch(`${apiUrl}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        throw new Error(error.error || response.statusText);
      }

      const result = (await response.json()) as any;
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
      } else {
        console.error('[Reagent] Browser opening disabled (--no-open). Access review at:', result.reviewUrl);
      }
    } catch (error: any) {
      console.error('[Reagent] Failed to create review:', error.message);
      process.exit(1);
    }
  });

program
  .command('get <sessionId>')
  .description('Get review status and results')
  .option('-p, --port <number>', 'Port to connect to', DEFAULT_PORT.toString())
  .option('--wait', 'Wait for the review to complete')
  .option('--json', 'Output result as JSON')
  .action(async (sessionId, options) => {
    const port = resolvePort(options.port);
    const apiUrl = `http://localhost:${port}/api`;

    try {
      let session;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const response = await fetch(`${apiUrl}/sessions/${sessionId}`);
        if (!response.ok) {
          if (response.status === 404) {
            console.error('[Reagent] Session not found.');
          } else {
            console.error(`[Reagent] Failed to fetch session: ${response.statusText}`);
          }
          process.exit(1);
        }

        session = (await response.json()) as any;

        if (!options.wait || session.status !== 'pending') {
          break;
        }

        await new Promise((r) => setTimeout(r, 1000));
      }

      if (options.json) {
        console.log(JSON.stringify(session, null, 2));
      } else {
        console.log(`Review Status: ${session.status}`);
        if (session.status === 'pending') {
          console.log('Review is still in progress.');
        } else {
          console.log(`\nGeneral Feedback:\n${session.generalFeedback || '(none)'}`);
          console.log(`\nComments (${session.comments.length}):`);
          session.comments.forEach((c: any) => {
            const lineInfo = c.startLine === c.endLine
              ? `${c.startLine}`
              : `${c.startLine}-${c.endLine}`;
            console.log(`- ${c.filePath}:${lineInfo}: ${c.text}`);
          });
        }
      }
    } catch (error: any) {
      console.error('[Reagent] Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
