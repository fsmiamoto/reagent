import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server as HttpServer } from "http";
import type express from "express";
import { Server } from "@src/http/server";
import type { LockManager, LockFileData } from "@src/http/lock";

function createMockLock(
  overrides: Partial<LockManager> = {},
): LockManager {
  return {
    acquireLock: vi.fn().mockReturnValue({ success: true }),
    removeLockFile: vi.fn(),
    getServerInfo: vi.fn().mockReturnValue(null),
    isProcessAlive: vi.fn().mockReturnValue(false),
    getServerPort: vi.fn().mockReturnValue(null),
    getLockFilePath: vi.fn().mockReturnValue("/tmp/reagent.lock"),
    ...overrides,
  } as unknown as LockManager;
}

function createMockHttpServer(
  overrides: Partial<HttpServer> = {},
): HttpServer {
  return {
    on: vi.fn(),
    close: vi.fn((callback?: () => void) => callback?.()),
    ...overrides,
  } as unknown as HttpServer;
}

function createMockApp(fakeServer: HttpServer): express.Express {
  return {
    listen: vi.fn((_port: number, callback?: () => void) => {
      if (callback) queueMicrotask(callback);
      return fakeServer;
    }),
  } as unknown as express.Express;
}

describe("Server", () => {
  let server: Server | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
    vi.restoreAllMocks();
  });

  describe("start", () => {
    it("starts and stops when lock is acquired", async () => {
      const lock = createMockLock();
      const fakeServer = createMockHttpServer();
      const fakeApp = createMockApp(fakeServer);

      server = new Server(lock, () => fakeApp);
      await server.start(0);

      expect(lock.acquireLock).toHaveBeenCalledWith(0);
      expect(server.isRunning()).toBe(true);
      expect(server.getPort()).toBe(0);
      expect(server.getHttpServer()).toBe(fakeServer);

      await server.stop();
      expect(lock.removeLockFile).toHaveBeenCalled();
    });

    it("throws when another server is already running", async () => {
      const lock = createMockLock({
        acquireLock: vi.fn().mockReturnValue({
          success: false,
          reason: "already_running",
          existingPort: 3636,
          existingPid: 1234,
        }),
      });

      server = new Server(lock);

      await expect(server.start(4000)).rejects.toThrow("already running");
    });

    it("throws lock error when lock fails for non-already_running reason", async () => {
      const lockError = new Error("Disk full");
      const lock = createMockLock({
        acquireLock: vi.fn().mockReturnValue({
          success: false,
          reason: "write_error",
          error: lockError,
        }),
      });

      server = new Server(lock);

      await expect(server.start(4000)).rejects.toThrow("Disk full");
    });

    it("throws EADDRINUSE with friendly message and cleans up lock", async () => {
      const lock = createMockLock();
      const eaddrinuseError = Object.assign(new Error("listen EADDRINUSE"), {
        code: "EADDRINUSE",
      });

      const fakeApp = {
        listen: vi.fn((_port: number, _callback?: () => void) => {
          const fakeServer = createMockHttpServer();
          // Emit error asynchronously
          queueMicrotask(() => {
            const errorHandler = (fakeServer.on as ReturnType<typeof vi.fn>)
              .mock.calls.find(([event]: string[]) => event === "error")?.[1];
            if (errorHandler) errorHandler(eaddrinuseError);
          });
          return fakeServer;
        }),
      } as unknown as express.Express;

      server = new Server(lock, () => fakeApp);

      await expect(server.start(3636)).rejects.toThrow(
        "Port 3636 is already in use",
      );
      expect(lock.removeLockFile).toHaveBeenCalled();
    });

    it("re-throws non-EADDRINUSE listen errors and cleans up lock", async () => {
      const lock = createMockLock();
      const genericError = new Error("permission denied");

      const fakeApp = {
        listen: vi.fn((_port: number, _callback?: () => void) => {
          const fakeServer = createMockHttpServer();
          queueMicrotask(() => {
            const errorHandler = (fakeServer.on as ReturnType<typeof vi.fn>)
              .mock.calls.find(([event]: string[]) => event === "error")?.[1];
            if (errorHandler) errorHandler(genericError);
          });
          return fakeServer;
        }),
      } as unknown as express.Express;

      server = new Server(lock, () => fakeApp);

      await expect(server.start(80)).rejects.toThrow("permission denied");
      expect(lock.removeLockFile).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("only removes lock when no httpServer exists", async () => {
      const lock = createMockLock();
      server = new Server(lock);

      await server.stop();

      expect(lock.removeLockFile).toHaveBeenCalled();
    });
  });

  describe("stopRunningProcess", () => {
    it("stops running process with SIGTERM", async () => {
      const lockInfo: LockFileData = {
        pid: 1234,
        port: 3636,
        startedAt: new Date().toISOString(),
        version: "1.0.0",
      };
      const lock = createMockLock({
        getServerInfo: vi.fn().mockReturnValue(lockInfo),
      });

      const killSpy = vi.spyOn(process, "kill").mockReturnValue(true);

      server = new Server(lock);
      const result = await server.stopRunningProcess(false);

      expect(result).toBe("stopped");
      expect(killSpy).toHaveBeenCalledWith(lockInfo.pid, "SIGTERM");
      expect(lock.removeLockFile).toHaveBeenCalled();
    });

    it("uses SIGKILL when force is true", async () => {
      const lockInfo: LockFileData = {
        pid: 5678,
        port: 3636,
        startedAt: new Date().toISOString(),
        version: "1.0.0",
      };
      const lock = createMockLock({
        getServerInfo: vi.fn().mockReturnValue(lockInfo),
      });

      const killSpy = vi.spyOn(process, "kill").mockReturnValue(true);

      server = new Server(lock);
      const result = await server.stopRunningProcess(true);

      expect(result).toBe("stopped");
      expect(killSpy).toHaveBeenCalledWith(5678, "SIGKILL");
    });

    it("returns not_running when no server info exists", async () => {
      const lock = createMockLock();

      server = new Server(lock);
      const result = await server.stopRunningProcess(false);

      expect(result).toBe("not_running");
    });

    it("returns not_running and cleans up lock when process not found (ESRCH)", async () => {
      const lockInfo: LockFileData = {
        pid: 9999,
        port: 3636,
        startedAt: new Date().toISOString(),
        version: "1.0.0",
      };
      const lock = createMockLock({
        getServerInfo: vi.fn().mockReturnValue(lockInfo),
      });

      const esrchError = Object.assign(new Error("kill ESRCH"), {
        code: "ESRCH",
      });
      vi.spyOn(process, "kill").mockImplementation(() => {
        throw esrchError;
      });

      server = new Server(lock);
      const result = await server.stopRunningProcess(false);

      expect(result).toBe("not_running");
      expect(lock.removeLockFile).toHaveBeenCalled();
    });

    it("re-throws non-ESRCH kill errors", async () => {
      const lockInfo: LockFileData = {
        pid: 9999,
        port: 3636,
        startedAt: new Date().toISOString(),
        version: "1.0.0",
      };
      const lock = createMockLock({
        getServerInfo: vi.fn().mockReturnValue(lockInfo),
      });

      const epermError = Object.assign(new Error("kill EPERM"), {
        code: "EPERM",
      });
      vi.spyOn(process, "kill").mockImplementation(() => {
        throw epermError;
      });

      server = new Server(lock);
      await expect(server.stopRunningProcess(false)).rejects.toThrow(
        "kill EPERM",
      );
    });

    it("waits for process to die before returning", async () => {
      const lockInfo: LockFileData = {
        pid: 1234,
        port: 3636,
        startedAt: new Date().toISOString(),
        version: "1.0.0",
      };

      let aliveCallCount = 0;
      const lock = createMockLock({
        getServerInfo: vi.fn().mockReturnValue(lockInfo),
        isProcessAlive: vi.fn().mockImplementation(() => {
          aliveCallCount++;
          // Process dies after 2 checks
          return aliveCallCount < 3;
        }),
      });

      vi.spyOn(process, "kill").mockReturnValue(true);

      server = new Server(lock);
      const result = await server.stopRunningProcess(false);

      expect(result).toBe("stopped");
      expect(aliveCallCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getServerStatus", () => {
    it("returns not running when no lock file exists", async () => {
      const lock = createMockLock({
        getLockFilePath: vi.fn().mockReturnValue("/home/user/.reagent/server.lock"),
      });

      server = new Server(lock);
      const status = await server.getServerStatus();

      expect(status.running).toBe(false);
      expect(status.pid).toBeUndefined();
      expect(status.port).toBeUndefined();
      expect(status.lockFilePath).toBe("/home/user/.reagent/server.lock");
    });

    it("returns server info when lock file exists and server is healthy", async () => {
      const lockInfo: LockFileData = {
        pid: 1234,
        port: 3636,
        startedAt: "2025-01-01T00:00:00.000Z",
        version: "1.0.0",
      };

      const lock = createMockLock({
        getServerInfo: vi.fn().mockReturnValue(lockInfo),
        getLockFilePath: vi.fn().mockReturnValue("/home/user/.reagent/server.lock"),
      });

      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      server = new Server(lock);
      const status = await server.getServerStatus();

      expect(status.running).toBe(true);
      expect(status.pid).toBe(1234);
      expect(status.port).toBe(3636);
      expect(status.startedAt).toBe("2025-01-01T00:00:00.000Z");
      expect(status.version).toBe("1.0.0");
      expect(status.healthy).toBe(true);
    });

    it("returns healthy false when health check fails", async () => {
      const lockInfo: LockFileData = {
        pid: 1234,
        port: 3636,
        startedAt: "2025-01-01T00:00:00.000Z",
        version: "1.0.0",
      };

      const lock = createMockLock({
        getServerInfo: vi.fn().mockReturnValue(lockInfo),
        getLockFilePath: vi.fn().mockReturnValue("/home/user/.reagent/server.lock"),
      });

      global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

      server = new Server(lock);
      const status = await server.getServerStatus();

      expect(status.running).toBe(true);
      expect(status.healthy).toBe(false);
    });

    it("returns healthy false when response is not ok", async () => {
      const lockInfo: LockFileData = {
        pid: 1234,
        port: 3636,
        startedAt: "2025-01-01T00:00:00.000Z",
        version: "1.0.0",
      };

      const lock = createMockLock({
        getServerInfo: vi.fn().mockReturnValue(lockInfo),
        getLockFilePath: vi.fn().mockReturnValue("/tmp/reagent.lock"),
      });

      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      server = new Server(lock);
      const status = await server.getServerStatus();

      expect(status.running).toBe(true);
      expect(status.healthy).toBe(false);
    });
  });

  describe("getPort / getHttpServer / isRunning", () => {
    it("returns null port and null httpServer before start", () => {
      const lock = createMockLock();
      server = new Server(lock);

      expect(server.getPort()).toBeNull();
      expect(server.getHttpServer()).toBeNull();
      expect(server.isRunning()).toBe(false);
    });
  });
});
