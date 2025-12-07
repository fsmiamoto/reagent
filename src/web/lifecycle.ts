import { spawn } from 'child_process';
import { getPort } from '../config.js';

export async function isServerRunning(port: number = getPort()): Promise<boolean> {
  const apiUrl = `http://localhost:${port}/api`;

  try {
    const res = await fetch(`${apiUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export function startServerInBackground(port: number = getPort()): void {
  console.error('[Reagent] Web server not running. Starting...');
  const child = spawn(process.argv[0], [process.argv[1], 'start', '--detach', '--port', port.toString()], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

export async function ensureServerRunning(port: number = getPort()): Promise<void> {
  const isRunning = await isServerRunning(port);

  if (isRunning) {
    return;
  }

  startServerInBackground(port);
}
