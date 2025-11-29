#!/usr/bin/env node

import { Server } from 'http';
import { startMCPServer } from './mcp/server.js';
import { startWebServer } from './web/server.js';
import { sessionStore } from './core/SessionStore.js';
import { setActualPort } from './mcp/tools/reviewHelpers.js';

let webServer: Server | null = null;
let isCleaningUp = false;

function cleanup() {
  // We're in Node so this is fine although is not properly atomic
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

async function main() {
  try {
    const port = parseInt(process.env.REAGENT_PORT || '3636', 10);
    const maxAttempts = parseInt(process.env.REAGENT_MAX_ATTEMPTS || '10', 10);

    const { server, port: actualPort } = await startWebServer(port, maxAttempts);
    webServer = server;
    setActualPort(actualPort);

    setInterval(() => {
      const cleaned = sessionStore.cleanupOldSessions();
      if (cleaned > 0) {
        console.error(`[Reagent] Cleaned up ${cleaned} old session(s)`);
      }
    }, 60 * 60 * 1000);

    process.stdin.on('end', cleanup);

    await startMCPServer();
  } catch (error) {
    console.error('[Reagent] Failed to start:', error);
    process.exit(1);
  }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

main();
