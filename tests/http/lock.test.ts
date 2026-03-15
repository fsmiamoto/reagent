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

  describe("removeLockFile", () => {
    it("does nothing when lock file does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      lockManager.removeLockFile();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("removes existing lock file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      lockManager.removeLockFile();

      expect(fs.unlinkSync).toHaveBeenCalledWith(lockManager.getLockFilePath());
    });

    it("logs error but does not throw when unlinkSync fails", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error("EPERM");
      });

      expect(() => lockManager.removeLockFile()).not.toThrow();
      expect(console.error).toHaveBeenCalledWith(
        "[Reagent] Failed to remove lock file:",
        expect.any(Error),
      );
    });
  });

  describe("acquireLock - write_error", () => {
    it("returns write_error when writeLockFile throws", () => {
      // No existing lock file
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error("ENOSPC");
      });

      const result = lockManager.acquireLock(3636);

      expect(result).toEqual({
        success: false,
        reason: "write_error",
        error: expect.any(Error),
      });
      if (!result.success && result.reason === "write_error") {
        expect(result.error.message).toContain("ENOSPC");
      }
    });

    it("wraps non-Error throws in an Error", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw "string error"; // eslint-disable-line no-throw-literal
      });

      const result = lockManager.acquireLock(3636);

      expect(result).toEqual({
        success: false,
        reason: "write_error",
        error: expect.objectContaining({ message: "Unknown error" }),
      });
    });
  });

  describe("getServerInfo", () => {
    it("returns null when no lock file exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(lockManager.getServerInfo()).toBeNull();
    });

    it("returns lock data when valid lock exists", () => {
      const lockData = {
        pid: 1234,
        port: 4000,
        startedAt: "2025-01-01T00:00:00.000Z",
        version: "1.0.0",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
      vi.spyOn(process, "kill").mockReturnValue(true);

      expect(lockManager.getServerInfo()).toEqual(lockData);
    });

    it("cleans up stale lock and returns null", () => {
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

      expect(lockManager.getServerInfo()).toBeNull();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "[Reagent] Cleaning up stale lock file",
      );
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
