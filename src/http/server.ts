import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as HttpServer } from 'http';
import { apiRouter } from './routes';
import { LockManager, lockManager } from './lock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Server {
  private httpServer: HttpServer | null = null;
  private port: number | null = null;
  private lock: LockManager;

  constructor(lock: LockManager = lockManager) {
    this.lock = lock;
  }

  async start(port: number): Promise<{ port: number }> {
    const lockResult = this.lock.acquireLock(port);

    if (!lockResult.success) {
      if (lockResult.reason === 'already_running') {
        throw new Error(
          `Another Reagent server is already running on port ${lockResult.existingPort} ` +
          `(PID: ${lockResult.existingPid}). Use "reagent stop" to stop it first.`
        );
      }
      throw lockResult.error;
    }

    const app = this.buildExpressApp();

    try {
      this.httpServer = await new Promise<HttpServer>((resolve, reject) => {
        const srv = app.listen(port, () => resolve(srv));
        srv.on('error', reject);
      });

      this.port = port;
      console.error(`[Reagent] Web server running on http://localhost:${port}`);
      return { port };
    } catch (error: unknown) {
      this.lock.removeLockFile();

      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
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
        console.error('[Reagent] Force exit after timeout');
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

  async stopRunningProcess(force: boolean): Promise<'stopped' | 'not_running'> {
    const serverInfo = this.lock.getServerInfo();

    if (!serverInfo) {
      return 'not_running';
    }

    const { pid, port } = serverInfo;
    const signal = force ? 'SIGKILL' : 'SIGTERM';

    try {
      console.error(`[Reagent] Stopping server (PID: ${pid}, Port: ${port})...`);
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
      return 'stopped';
    } catch (error: unknown) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ESRCH') {
        console.error('[Reagent] Server process not found, cleaning up lock file.');
        this.lock.removeLockFile();
        return 'not_running';
      }
      throw error;
    }
  }

  buildExpressApp() {
    const app = express();

    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    app.use('/api', apiRouter);

    const uiDistPath = path.join(__dirname, '../../ui/dist');
    app.use(express.static(uiDistPath));

    app.get('*', (_req, res) => {
      res.sendFile(path.join(uiDistPath, 'index.html'));
    });

    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const error = err as { status?: number; message?: string };
      console.error('[Reagent] Express error:', err);
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error',
      });
    });

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
        const response = await fetch(`http://localhost:${serverInfo.port}/api/health`, {
          signal: controller.signal,
        });
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
  startedAt?: string;
  version?: string;
  healthy?: boolean;
  lockFilePath?: string;
}

export const server = new Server();
