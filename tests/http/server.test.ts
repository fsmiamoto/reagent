import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Server as HttpServer } from 'http';
import type express from 'express';
import { Server } from '@src/http/server';
import type { LockManager, LockFileData } from '@src/http/lock';

describe('Server', () => {
  let server: Server | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
    vi.restoreAllMocks();
  });

  it('starts and stops when lock is acquired', async () => {
    const lock = {
      acquireLock: vi.fn().mockReturnValue({ success: true, port: 0 }),
      removeLockFile: vi.fn(),
      getServerInfo: vi.fn(),
      isProcessAlive: vi.fn(),
    } as unknown as LockManager;

    const fakeServer = {
      on: vi.fn(),
      close: vi.fn((callback?: () => void) => {
        callback?.();
      }),
    } as unknown as HttpServer;

    const fakeApp = {
      listen: vi.fn((_port: number, callback?: () => void) => {
        if (callback) {
          queueMicrotask(callback);
        }
        return fakeServer;
      }),
    } as unknown as express.Express;

    server = new Server(lock, () => fakeApp);
    await server.start(0);

    expect(lock.acquireLock).toHaveBeenCalledWith(0);
    expect(server.isRunning()).toBe(true);

    await server.stop();
    expect(lock.removeLockFile).toHaveBeenCalled();
  });

  it('throws when another server is already running', async () => {
    const lock = {
      acquireLock: vi.fn().mockReturnValue({
        success: false,
        reason: 'already_running',
        existingPort: 3636,
        existingPid: 1234,
      }),
      removeLockFile: vi.fn(),
      getServerInfo: vi.fn(),
      isProcessAlive: vi.fn(),
    } as unknown as LockManager;

    server = new Server(lock);

    await expect(server.start(4000)).rejects.toThrow('already running');
  });

  it('stops running process when lock info exists', async () => {
    const lockInfo: LockFileData = {
      pid: 1234,
      port: 3636,
      startedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    const lock = {
      acquireLock: vi.fn(),
      removeLockFile: vi.fn(),
      getServerInfo: vi.fn().mockReturnValue(lockInfo),
      isProcessAlive: vi.fn().mockReturnValue(false),
    } as unknown as LockManager;

    const killSpy = vi.spyOn(process, 'kill').mockReturnValue(true);

    server = new Server(lock);
    const result = await server.stopRunningProcess(false);

    expect(result).toBe('stopped');
    expect(killSpy).toHaveBeenCalledWith(lockInfo.pid, 'SIGTERM');
    expect(lock.removeLockFile).toHaveBeenCalled();
  });
});
