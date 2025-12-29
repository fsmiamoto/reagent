import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import { LockManager } from "@src/http/lock";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(() => JSON.stringify({ version: "1.0.0" })),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

describe("LockManager", () => {
  let lockManager: LockManager;
  const lockDir = "/tmp/reagent-lock";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    lockManager = new LockManager("1.0.0", lockDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("readLockFile", () => {
    it("returns null when no lock file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = lockManager.readLockFile();

      expect(result).toBeNull();
    });

    it("returns null for invalid JSON", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("not json");

      const result = lockManager.readLockFile();

      expect(result).toBeNull();
    });

    it("returns null for missing required fields", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ foo: "bar" }),
      );

      const result = lockManager.readLockFile();

      expect(result).toBeNull();
    });
  });

  describe("writeLockFile", () => {
    it("writes lock file with correct data", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      lockManager.writeLockFile(4000);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const parsed = JSON.parse(written) as { port: number; pid: number };

      expect(parsed.port).toBe(4000);
      expect(typeof parsed.pid).toBe("number");
    });

    it("creates lock directory when missing", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      lockManager.writeLockFile(4000);

      expect(fs.mkdirSync).toHaveBeenCalledWith(lockDir, { recursive: true });
    });

    it("throws error when lock directory cannot be created", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementationOnce(() => {
        throw new Error("no access");
      });

      expect(() => lockManager.writeLockFile(4000)).toThrow(
        "Failed to create lock directory",
      );
    });
  });

  describe("isProcessAlive", () => {
    it("returns true when process.kill succeeds", () => {
      const killSpy = vi.spyOn(process, "kill").mockReturnValue(true);

      const result = lockManager.isProcessAlive(1234);

      expect(result).toBe(true);
      expect(killSpy).toHaveBeenCalledWith(1234, 0);
    });

    it("returns false when process.kill throws", () => {
      vi.spyOn(process, "kill").mockImplementation(() => {
        throw new Error("ESRCH");
      });

      const result = lockManager.isProcessAlive(1234);

      expect(result).toBe(false);
    });
  });

  describe("acquireLock", () => {
    it("acquires lock when no existing lock", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = lockManager.acquireLock(3636);

      expect(result).toEqual({ success: true, port: 3636 });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("fails when another server is running", () => {
      const lockData = {
        pid: 1234,
        port: 3636,
        startedAt: "2025-01-01T00:00:00.000Z",
        version: "1.0.0",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
      vi.spyOn(process, "kill").mockReturnValue(true);

      const result = lockManager.acquireLock(4000);

      expect(result).toEqual({
        success: false,
        reason: "already_running",
        existingPort: 3636,
        existingPid: 1234,
      });
    });

    it("cleans up stale lock and acquires", () => {
      const lockData = {
        pid: 1234,
        port: 3636,
        startedAt: "2025-01-01T00:00:00.000Z",
        version: "1.0.0",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
      vi.spyOn(process, "kill").mockImplementation(() => {
        throw new Error("ESRCH");
      });

      const result = lockManager.acquireLock(4000);

      expect(result).toEqual({ success: true, port: 4000 });
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe("getServerPort", () => {
    it("returns null when no lock file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(lockManager.getServerPort()).toBeNull();
    });

    it("returns port when valid lock exists", () => {
      const lockData = {
        pid: 1234,
        port: 4000,
        startedAt: "2025-01-01T00:00:00.000Z",
        version: "1.0.0",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
      vi.spyOn(process, "kill").mockReturnValue(true);

      expect(lockManager.getServerPort()).toBe(4000);
    });

    it("cleans up and returns null for stale lock", () => {
      const lockData = {
        pid: 1234,
        port: 4000,
        startedAt: "2025-01-01T00:00:00.000Z",
        version: "1.0.0",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
      vi.spyOn(process, "kill").mockImplementation(() => {
        throw new Error("ESRCH");
      });

      expect(lockManager.getServerPort()).toBeNull();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });
});
