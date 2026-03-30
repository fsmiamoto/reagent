import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Server as HttpServer } from "http";
import { apiRouter } from "./routes";
import { LockManager, lockManager } from "./lock";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the package root by locating package.json relative to the executing file.
// When bundled by Bun (splitting: false), all code is inlined into dist/index.js,
// so import.meta.url points to dist/index.js (1 level deep), not dist/http/server.js
// (2 levels deep). Walking up to find package.json works in both cases.
function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, "package.json")) &&
      fs.existsSync(path.join(dir, "ui"))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

export class Server {
  private httpServer: HttpServer | null = null;
  private port: number | null = null;
  private host: string = "localhost";
  private lock: LockManager;
  private appFactory: (host: string) => express.Express;

  constructor(
    lock: LockManager = lockManager,
    appFactory?: (host: string) => express.Express,
  ) {
    this.lock = lock;
    this.appFactory =
      appFactory ?? ((host: string) => this.buildExpressApp(host));
  }

  async start(port: number, host?: string): Promise<{ port: number }> {
    this.host = host || "localhost";
    const hostForLock = this.host !== "localhost" ? this.host : undefined;
    const lockResult = this.lock.acquireLock(port, hostForLock);

    if (!lockResult.success) {
      if (lockResult.reason === "already_running") {
        throw new Error(
          `Another Reagent server is already running on port ${lockResult.existingPort} ` +
            `(PID: ${lockResult.existingPid}). Use "reagent stop" to stop it first.`,
        );
      }
      throw lockResult.error;
    }

    const app = this.appFactory(this.host);

    try {
      this.httpServer = await new Promise<HttpServer>((resolve, reject) => {
        const srv = app.listen(port, () => resolve(srv));
        srv.on("error", reject);
      });

      this.port = port;
      console.error(
        `[Reagent] Web server running on http://${this.host}:${port}`,
      );
      return { port };
    } catch (error: unknown) {
      this.lock.removeLockFile();

      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EADDRINUSE"
      ) {
        throw new Error(`Port ${port} is already in use`);
      }
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.lock.removeLockFile();

    if (!this.httpServer) {
      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.error("[Reagent] Force exit after timeout");
        resolve();
      }, 5000);

      this.httpServer?.close(() => {
        clearTimeout(timeout);
        this.httpServer = null;
        this.port = null;
        resolve();
      });
    });
  }

  async stopRunningProcess(force: boolean): Promise<"stopped" | "not_running"> {
    const serverInfo = this.lock.getServerInfo();

    if (!serverInfo) {
      return "not_running";
    }

    const { pid, port } = serverInfo;
    const signal = force ? "SIGKILL" : "SIGTERM";

    try {
      console.error(
        `[Reagent] Stopping server (PID: ${pid}, Port: ${port})...`,
      );
      process.kill(pid, signal);

      const maxWait = force ? 1000 : 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        if (!this.lock.isProcessAlive(pid)) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.lock.removeLockFile();
      return "stopped";
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "ESRCH") {
        console.error(
          "[Reagent] Server process not found, cleaning up lock file.",
        );
        this.lock.removeLockFile();
        return "not_running";
      }
      throw error;
    }
  }

  buildExpressApp(host: string = "localhost") {
    const app = express();
    app.locals.configuredHost = host;

    app.use(cors());
    app.use(express.json({ limit: "50mb" }));

    app.use("/api", apiRouter);

    const uiDistPath = path.join(findPackageRoot(__dirname), "ui/dist");
    app.use(express.static(uiDistPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(uiDistPath, "index.html"));
    });

    app.use(
      (
        err: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        console.error("[Reagent] Express error:", err);
        const status =
          typeof err === "object" &&
          err !== null &&
          "status" in err &&
          typeof err.status === "number"
            ? err.status
            : 500;
        const message =
          err instanceof Error ? err.message : "Internal server error";
        res.status(status).json({ error: message });
      },
    );

    return app;
  }

  isRunning(): boolean {
    return this.httpServer !== null;
  }

  getPort(): number | null {
    return this.port;
  }

  getHttpServer(): HttpServer | null {
    return this.httpServer;
  }

  async getServerStatus(): Promise<ServerStatus> {
    const serverInfo = this.lock.getServerInfo();

    if (!serverInfo) {
      return {
        running: false,
        lockFilePath: this.lock.getLockFilePath(),
      };
    }

    let healthy = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      try {
        const response = await fetch(
          `http://localhost:${serverInfo.port}/api/health`,
          {
            signal: controller.signal,
          },
        );
        healthy = response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      healthy = false;
    }

    return {
      running: true,
      pid: serverInfo.pid,
      port: serverInfo.port,
      host: serverInfo.host,
      startedAt: serverInfo.startedAt,
      version: serverInfo.version,
      healthy,
      lockFilePath: this.lock.getLockFilePath(),
    };
  }
}

export interface ServerStatus {
  running: boolean;
  pid?: number;
  port?: number;
  host?: string;
  startedAt?: string;
  version?: string;
  healthy?: boolean;
  lockFilePath?: string;
}

export const server = new Server();
