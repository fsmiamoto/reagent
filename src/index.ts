#!/usr/bin/env node

import { startMCPServer } from './mcp/server.js';
import { startWebServer } from './web/server.js';
import { sessionStore } from './core/SessionStore.js';

/**
 * Main entry point for Reagent
 *
 * Starts both the web server (for the review UI) and the MCP server (for tool communication)
 */
async function main() {
  try {
    // Get port from environment or use default
    const port = parseInt(process.env.REAGENT_PORT || '3636', 10);

    // Start the web server first (so it's ready when reviews are opened)
    await startWebServer(port);

    // Set up periodic cleanup of old sessions (every hour)
    setInterval(() => {
      const cleaned = sessionStore.cleanupOldSessions();
      if (cleaned > 0) {
        console.error(`[Reagent] Cleaned up ${cleaned} old session(s)`);
      }
    }, 60 * 60 * 1000);

    // Start the MCP server (this will block and handle stdio communication)
    await startMCPServer();
  } catch (error) {
    console.error('[Reagent] Failed to start:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\n[Reagent] Shutting down...');
  sessionStore.clear();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n[Reagent] Shutting down...');
  sessionStore.clear();
  process.exit(0);
});

main();
