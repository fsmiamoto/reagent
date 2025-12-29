import { spawn, ChildProcess, execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
const CLI_PATH = path.join(PROJECT_ROOT, "dist/index.js");
const LOCK_FILE_PATH = path.join(os.homedir(), ".reagent", "server.lock");

export interface ServerOptions {
  port: number;
  env?: Record<string, string>;
  detach?: boolean;
}

export interface ServerHandle {
  port: number;
  process?: ChildProcess;
  stop: () => Promise<void>;
}

/**
 * Clean up any lock files (useful for test setup/teardown).
 */
export function cleanupLockFile(): void {
  const candidates = [LOCK_FILE_PATH];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        fs.unlinkSync(candidate);
      }
    } catch {
      // Ignore errors during cleanup
    }
  }
}

/**
 * Start the reagent server with the given options.
 * Returns a handle with a stop() function to clean up.
 */
export async function startServer(
  options: ServerOptions,
): Promise<ServerHandle> {
  const { port, env = {}, detach = true } = options;

  cleanupLockFile();

  const args = ["start", "--port", String(port)];
  if (detach) {
    args.push("--detach");
  }

  const proc = spawn("node", [CLI_PATH, ...args], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    stdio: detach ? "ignore" : "pipe",
    detached: detach,
  });

  if (detach) {
    proc.unref();
  }

  // Wait for server to be ready
  await waitForServer(port);

  return {
    port,
    process: detach ? undefined : proc,
    stop: async () => {
      await killServerOnPort(port);
      cleanupLockFile();
    },
  };
}

/**
 * Wait for a server to be healthy on the given port.
 * Polls the health endpoint every 200ms for up to 10 seconds.
 */
export async function waitForServer(
  port: number,
  timeoutMs = 10000,
): Promise<void> {
  const healthUrl = `http://localhost:${port}/api/health`;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet, continue polling
    }
    await sleep(200);
  }

  throw new Error(
    `Server failed to start on port ${port} within ${timeoutMs}ms`,
  );
}

/**
 * Kill any process listening on the given port.
 * Uses lsof on macOS/Linux.
 */
export async function killServerOnPort(port: number): Promise<void> {
  try {
    const pid = execSync(`lsof -t -i:${port}`, { encoding: "utf-8" }).trim();
    if (pid) {
      process.kill(Number(pid), "SIGTERM");
      // Wait a bit for the process to terminate
      await sleep(500);
    }
  } catch {
    // No process on that port, which is fine
  }
}

/**
 * Run a CLI command and return the output.
 */
export function runCli(args: string[], env?: Record<string, string>): string {
  const result = execSync(`node ${CLI_PATH} ${args.join(" ")}`, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    encoding: "utf-8",
  });
  return result;
}

/**
 * Run a CLI command and return the output, allowing for failure.
 */
export function tryRunCli(
  args: string[],
  env?: Record<string, string>,
): { success: boolean; output: string } {
  try {
    const output = runCli(args, env);
    return { success: true, output };
  } catch (error) {
    const output = error instanceof Error ? error.message : String(error);
    return { success: false, output };
  }
}

/**
 * Extract a UUID from a string (e.g., session ID from output).
 */
export function extractSessionId(output: string): string | null {
  const match = output.match(/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

/**
 * Sleep for the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an HTTP request to the API.
 */
export async function apiRequest<T>(
  port: number,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const url = `http://localhost:${port}${path}`;
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as T;
  return { status: response.status, data };
}
