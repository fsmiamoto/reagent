import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from "fs";
import * as path from "path";
import { getLocalFiles, extractReviewFiles } from "@src/files/files";
import type { ReviewInput } from "@src/models/api";
import type { ReviewFile } from "@src/models/domain";

vi.mock("@src/git/git", () => ({
  getReviewFilesFromGit: vi.fn(),
}));

describe("getLocalFiles", () => {
  let tempDir: string;

  beforeEach(() => {
    const tmpBase = process.env.TMPDIR || "/tmp";
    tempDir = mkdtempSync(path.join(tmpBase, "reagent-test-files-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should read existing files correctly", () => {
    const filePath = path.join(tempDir, "test.ts");
    const content = 'console.log("hello");';
    writeFileSync(filePath, content);

    const result = getLocalFiles(["test.ts"], tempDir);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: "test.ts",
      content,
      oldContent: undefined,
      language: "typescript",
    });
  });

  it("should handle non-existent files gracefully", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = getLocalFiles(["non-existent.ts"], tempDir);

    expect(result).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("File not found"),
    );
  });

  it("should skip directories", () => {
    const dirPath = path.join(tempDir, "subdir");
    mkdirSync(dirPath);
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = getLocalFiles(["subdir"], tempDir);

    expect(result).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Not a file"),
    );
  });

  it("should detect languages correctly", () => {
    const files = {
      "test.py": 'print("hello")',
      "test.md": "# Hello",
      "test.json": "{}",
      "test.unknown": "content",
    };

    for (const [name, content] of Object.entries(files)) {
      writeFileSync(path.join(tempDir, name), content);
    }

    const result = getLocalFiles(Object.keys(files), tempDir);

    const langMap = new Map(result.map((f) => [f.path, f.language]));
    expect(langMap.get("test.py")).toBe("python");
    expect(langMap.get("test.md")).toBe("markdown");
    expect(langMap.get("test.json")).toBe("json");
    expect(langMap.get("test.unknown")).toBe("unknown");
  });

  it("should handle absolute file paths", () => {
    const filePath = path.join(tempDir, "abs.ts");
    writeFileSync(filePath, "content");

    const result = getLocalFiles([filePath], tempDir);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe(filePath);
    expect(result[0].content).toBe("content");
  });

  it("should log and skip files that fail to read", () => {
    const filePath = path.join(tempDir, "unreadable.ts");
    writeFileSync(filePath, "content");
    chmodSync(filePath, 0o000);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = getLocalFiles(["unreadable.ts"], tempDir);

    expect(result).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to read file"),
      expect.anything(),
    );

    // Restore permissions for cleanup
    chmodSync(filePath, 0o644);
  });

  it("should block relative path traversal (../)", () => {
    writeFileSync(path.join(tempDir, "legit.ts"), "ok");
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = getLocalFiles(["../../../etc/passwd"], tempDir);

    expect(result).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Path traversal blocked"),
    );
  });

  it("should block absolute paths outside working directory", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = getLocalFiles(["/etc/passwd"], tempDir);

    expect(result).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Path traversal blocked"),
    );
  });

  it("should allow files in subdirectories within working directory", () => {
    const subdir = path.join(tempDir, "src");
    mkdirSync(subdir);
    writeFileSync(path.join(subdir, "app.ts"), "code");

    const result = getLocalFiles(["src/app.ts"], tempDir);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("code");
  });

  it("should block paths that escape and re-enter via symlink-like traversal", () => {
    // e.g., "subdir/../../etc/passwd" — resolves outside workingDir
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = getLocalFiles(["subdir/../../etc/passwd"], tempDir);

    expect(result).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Path traversal blocked"),
    );
  });

  it("should use process.cwd() when no cwd is provided", () => {
    // Create a file in the temp dir that matches what process.cwd() would resolve
    const filePath = path.join(process.cwd(), "package.json");
    // package.json exists in project root
    const result = getLocalFiles(["package.json"]);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("package.json");
    expect(result[0].language).toBe("json");
  });
});

describe("extractReviewFiles", () => {
  let tempDir: string;

  beforeEach(() => {
    const tmpBase = process.env.TMPDIR || "/tmp";
    tempDir = mkdtempSync(path.join(tmpBase, "reagent-test-extract-"));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should use local source and read files from disk", () => {
    writeFileSync(path.join(tempDir, "app.ts"), "const x = 1;");

    const input: ReviewInput = {
      source: "local",
      files: ["app.ts"],
      workingDirectory: tempDir,
    };

    const result = extractReviewFiles(input);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe("app.ts");
    expect(result.files[0].content).toBe("const x = 1;");
  });

  it("should throw when local source has no files", () => {
    const input: ReviewInput = {
      source: "local",
      files: [],
    };

    expect(() => extractReviewFiles(input)).toThrow(
      "Files must be specified for local review",
    );
  });

  it("should throw when local source has undefined files", () => {
    const input: ReviewInput = {
      source: "local",
    };

    expect(() => extractReviewFiles(input)).toThrow(
      "Files must be specified for local review",
    );
  });

  it("should pass title and description through", () => {
    writeFileSync(path.join(tempDir, "file.ts"), "code");

    const input: ReviewInput = {
      source: "local",
      files: ["file.ts"],
      workingDirectory: tempDir,
      title: "My Review",
      description: "Review description",
    };

    const result = extractReviewFiles(input);

    expect(result.title).toBe("My Review");
    expect(result.description).toBe("Review description");
  });

  it("should delegate to getReviewFilesFromGit for uncommitted source", async () => {
    const { getReviewFilesFromGit } = await import("@src/git/git");
    const mockFiles: ReviewFile[] = [
      { path: "changed.ts", content: "new", oldContent: "old" },
    ];
    vi.mocked(getReviewFilesFromGit).mockReturnValue(mockFiles);

    const input: ReviewInput = {
      source: "uncommitted",
    };

    const result = extractReviewFiles(input);

    expect(getReviewFilesFromGit).toHaveBeenCalledWith(
      expect.objectContaining({ source: "uncommitted" }),
    );
    expect(result.files).toEqual(mockFiles);
  });

  it("should delegate to getReviewFilesFromGit for commit source", async () => {
    const { getReviewFilesFromGit } = await import("@src/git/git");
    const mockFiles: ReviewFile[] = [{ path: "file.ts", content: "committed" }];
    vi.mocked(getReviewFilesFromGit).mockReturnValue(mockFiles);

    const input: ReviewInput = {
      source: "commit",
      commitHash: "abc123",
    };

    const result = extractReviewFiles(input);

    expect(getReviewFilesFromGit).toHaveBeenCalledWith(
      expect.objectContaining({ source: "commit", commitHash: "abc123" }),
    );
    expect(result.files).toEqual(mockFiles);
  });

  it("should delegate to getReviewFilesFromGit for branch source", async () => {
    const { getReviewFilesFromGit } = await import("@src/git/git");
    const mockFiles: ReviewFile[] = [
      { path: "diff.ts", content: "branch content" },
    ];
    vi.mocked(getReviewFilesFromGit).mockReturnValue(mockFiles);

    const input: ReviewInput = {
      source: "branch",
      base: "main",
      head: "feature",
    };

    const result = extractReviewFiles(input);

    expect(getReviewFilesFromGit).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "branch",
        base: "main",
        head: "feature",
      }),
    );
    expect(result.files).toEqual(mockFiles);
  });

  it("should auto-detect source as uncommitted when no source or hints given", async () => {
    const { getReviewFilesFromGit } = await import("@src/git/git");
    vi.mocked(getReviewFilesFromGit).mockReturnValue([]);

    const input: ReviewInput = {};

    extractReviewFiles(input);

    expect(getReviewFilesFromGit).toHaveBeenCalledWith(
      expect.objectContaining({ source: "uncommitted" }),
    );
  });

  it("should auto-detect source as commit when commitHash is provided", async () => {
    const { getReviewFilesFromGit } = await import("@src/git/git");
    vi.mocked(getReviewFilesFromGit).mockReturnValue([]);

    const input: ReviewInput = {
      commitHash: "def456",
    };

    extractReviewFiles(input);

    expect(getReviewFilesFromGit).toHaveBeenCalledWith(
      expect.objectContaining({ source: "commit", commitHash: "def456" }),
    );
  });

  it("should auto-detect source as branch when base is provided", async () => {
    const { getReviewFilesFromGit } = await import("@src/git/git");
    vi.mocked(getReviewFilesFromGit).mockReturnValue([]);

    const input: ReviewInput = {
      base: "main",
    };

    extractReviewFiles(input);

    expect(getReviewFilesFromGit).toHaveBeenCalledWith(
      expect.objectContaining({ source: "branch", base: "main" }),
    );
  });

  it("should log the source with auto-detected label when source not explicitly set", async () => {
    const { getReviewFilesFromGit } = await import("@src/git/git");
    vi.mocked(getReviewFilesFromGit).mockReturnValue([]);

    extractReviewFiles({});

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("(auto-detected)"),
    );
  });

  it("should log the source without auto-detected label when source is explicit", async () => {
    const { getReviewFilesFromGit } = await import("@src/git/git");
    vi.mocked(getReviewFilesFromGit).mockReturnValue([]);

    extractReviewFiles({ source: "uncommitted" });

    expect(console.error).toHaveBeenCalledWith(
      "[Reagent] Using source: uncommitted",
    );
  });
});
