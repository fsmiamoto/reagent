import * as fs from "node:fs";
import os from "os";
import path from "path";
import { z } from "zod";
import { getReagentVersion } from "../version";

const LOCK_FILE_NAME = "server.lock";

export interface LockFileData {
  pid: number;
  port: number;
  startedAt: string;
  version: string;
}

export type AcquireLockResult =
  | { success: true; port: number }
  | {
      success: false;
      reason: "already_running";
      existingPort: number;
      existingPid: number;
    }
  | { success: false; reason: "write_error"; error: Error };

const LockFileSchema = z.object({
  pid: z.number().int().positive(),
  port: z.number().int().positive(),
  startedAt: z.string().min(1),
  version: z.string().min(1),
});

export class LockManager {
  private lockDir: string;
  private lockPath: string;
  private version: string;

  constructor(version: string, lockDir?: string) {
    this.lockDir = lockDir ?? path.join(os.homedir(), ".reagent");
    this.lockPath = path.join(this.lockDir, LOCK_FILE_NAME);
    this.version = version;
  }

  getLockFilePath(): string {
    return this.lockPath;
  }

  private ensureLockDir(): void {
    try {
      if (!fs.existsSync(this.lockDir)) {
        fs.mkdirSync(this.lockDir, { recursive: true });
      }
    } catch (error: unknown) {
      throw new Error(
        `Failed to create lock directory at ${this.lockDir}: ${error}`,
      );
    }
  }

  readLockFile(): LockFileData | null {
    try {
      if (!fs.existsSync(this.lockPath)) {
        return null;
      }

      const content = fs.readFileSync(this.lockPath, "utf-8");
      const result = LockFileSchema.safeParse(JSON.parse(content));

      if (!result.success) {
        console.error("[Reagent] Corrupted lock file, ignoring");
        return null;
      }

      return result.data;
    } catch (error: unknown) {
      console.error("[Reagent] Failed to read lock file:", error);
      return null;
    }
  }

  writeLockFile(port: number): void {
    this.ensureLockDir();
    const data: LockFileData = {
      pid: process.pid,
      port,
      startedAt: new Date().toISOString(),
      version: this.version,
    };

    fs.writeFileSync(this.lockPath, JSON.stringify(data, null, 2));
  }

  removeLockFile(): void {
    try {
      if (!fs.existsSync(this.lockPath)) {
        return;
      }
      fs.unlinkSync(this.lockPath);
    } catch (error: unknown) {
      console.error("[Reagent] Failed to remove lock file:", error);
    }
  }

  isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  isLockStale(lockData: LockFileData): boolean {
    return !this.isProcessAlive(lockData.pid);
  }

  acquireLock(port: number): AcquireLockResult {
    const existingLock = this.readLockFile();

    if (existingLock) {
      const isStale = this.isLockStale(existingLock);

      if (!isStale) {
        return {
          success: false,
          reason: "already_running",
          existingPort: existingLock.port,
          existingPid: existingLock.pid,
        };
      }

      console.error("[Reagent] Cleaning up stale lock file");
      this.removeLockFile();
    }

    try {
      this.writeLockFile(port);
      return { success: true, port };
    } catch (error: unknown) {
      const typedError =
        error instanceof Error ? error : new Error("Unknown error");
      return { success: false, reason: "write_error", error: typedError };
    }
  }

  getServerPort(): number | null {
    const lockData = this.readLockFile();

    if (!lockData) {
      return null;
    }

    if (this.isLockStale(lockData)) {
      console.error("[Reagent] Cleaning up stale lock file");
      this.removeLockFile();
      return null;
    }

    return lockData.port;
  }

  getServerInfo(): LockFileData | null {
    const lockData = this.readLockFile();

    if (!lockData) {
      return null;
    }

    if (this.isLockStale(lockData)) {
      console.error("[Reagent] Cleaning up stale lock file");
      this.removeLockFile();
      return null;
    }

    return lockData;
  }
}

export const lockManager = new LockManager(getReagentVersion());
