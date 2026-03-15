import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import * as path from "path";
import { getReviewFilesFromGit } from "@src/git/git";

describe("getReviewFilesFromGit", () => {
  let tempDir: string;

  beforeEach(() => {
    const tmpBase = process.env.TMPDIR || "/tmp";
    tempDir = mkdtempSync(path.join(tmpBase, "reagent-test-"));

    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempDir,
      stdio: "ignore",
    });
    execSync('git config user.name "Test User"', {
      cwd: tempDir,
      stdio: "ignore",
    });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should handle untracked files in nested directories", () => {
    mkdirSync(path.join(tempDir, "tmp", "nested"), { recursive: true });
    writeFileSync(
      path.join(tempDir, "tmp", "nested", "file.ts"),
      "export const nested = 1;\n",
    );

    const result = getReviewFilesFromGit({
      source: "uncommitted",
      workingDirectory: tempDir,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      path: "tmp/nested/file.ts",
      content: "export const nested = 1;\n",
      language: "typescript",
    });
    expect(result[0].oldContent).toBeUndefined();
  });

  it("should preserve empty untracked files", () => {
    writeFileSync(path.join(tempDir, "empty.txt"), "");

    const result = getReviewFilesFromGit({
      source: "uncommitted",
      workingDirectory: tempDir,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      path: "empty.txt",
      content: "",
      language: "txt",
    });
    expect(result[0].oldContent).toBeUndefined();
  });

  it("should include modified tracked files alongside new files", () => {
    writeFileSync(
      path.join(tempDir, "existing.ts"),
      "export const original = 1;\n",
    );
    execSync("git add existing.ts", { cwd: tempDir, stdio: "ignore" });
    execSync('git commit -m "initial commit"', {
      cwd: tempDir,
      stdio: "ignore",
    });
    writeFileSync(
      path.join(tempDir, "existing.ts"),
      "export const modified = 2;\n",
    );

    mkdirSync(path.join(tempDir, "src"), { recursive: true });
    writeFileSync(
      path.join(tempDir, "src", "new.ts"),
      "export const newFile = 3;\n",
    );

    const result = getReviewFilesFromGit({
      source: "uncommitted",
      workingDirectory: tempDir,
    });

    expect(result).toHaveLength(2);

    const existingFile = result.find((f) => f.path === "existing.ts");
    expect(existingFile).toBeDefined();
    expect(existingFile?.content).toBe("export const modified = 2;\n");
    expect(existingFile?.oldContent).toBe("export const original = 1;\n");

    const newFile = result.find((f) => f.path === "src/new.ts");
    expect(newFile).toBeDefined();
    expect(newFile?.content).toBe("export const newFile = 3;\n");
    expect(newFile?.oldContent).toBeUndefined();
  });

  it("should handle multiple nested levels correctly", () => {
    mkdirSync(path.join(tempDir, "a", "b", "c"), { recursive: true });
    writeFileSync(path.join(tempDir, "a", "b", "c", "d.ts"), "deep content\n");
    writeFileSync(path.join(tempDir, "a", "file.ts"), "shallow content\n");

    const result = getReviewFilesFromGit({
      source: "uncommitted",
      workingDirectory: tempDir,
    });

    expect(result).toHaveLength(2);
    const paths = result.map((f) => f.path).sort();
    expect(paths).toEqual(["a/b/c/d.ts", "a/file.ts"]);
  });

  it("should not include directory placeholders", () => {
    mkdirSync(path.join(tempDir, "dir"), { recursive: true });
    writeFileSync(path.join(tempDir, "dir", "file.ts"), "file content\n");

    const result = getReviewFilesFromGit({
      source: "uncommitted",
      workingDirectory: tempDir,
    });

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("dir/file.ts");
  });

  it("should respect the file filtering when untracked files are nested", () => {
    mkdirSync(path.join(tempDir, "feature", "subdir"), { recursive: true });
    mkdirSync(path.join(tempDir, "other"), { recursive: true });
    writeFileSync(
      path.join(tempDir, "feature", "subdir", "new.ts"),
      "new content\n",
    );
    writeFileSync(path.join(tempDir, "other", "file.ts"), "other content\n");

    const result = getReviewFilesFromGit({
      source: "uncommitted",
      workingDirectory: tempDir,
      files: ["feature"],
    });

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("feature/subdir/new.ts");
  });

  describe("source: commit", () => {
    it("should return files changed in a specific commit", () => {
      writeFileSync(path.join(tempDir, "base.ts"), "base\n");
      execSync("git add base.ts", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "base"', { cwd: tempDir, stdio: "ignore" });

      writeFileSync(path.join(tempDir, "added.ts"), "new file\n");
      writeFileSync(path.join(tempDir, "base.ts"), "modified\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "changes"', { cwd: tempDir, stdio: "ignore" });

      const commitHash = execSync("git rev-parse HEAD", {
        cwd: tempDir,
        encoding: "utf-8",
      }).trim();

      const result = getReviewFilesFromGit({
        source: "commit",
        commitHash,
        workingDirectory: tempDir,
      });

      expect(result).toHaveLength(2);

      const addedFile = result.find((f) => f.path === "added.ts");
      expect(addedFile).toBeDefined();
      expect(addedFile?.content).toBe("new file\n");
      expect(addedFile?.oldContent).toBeUndefined();

      const modifiedFile = result.find((f) => f.path === "base.ts");
      expect(modifiedFile).toBeDefined();
      expect(modifiedFile?.content).toBe("modified\n");
      expect(modifiedFile?.oldContent).toBe("base\n");
    });

    it("should respect file filtering for commit source", () => {
      // Need a base commit so diff-tree has a parent to compare against
      writeFileSync(path.join(tempDir, "placeholder.txt"), "base\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "base"', { cwd: tempDir, stdio: "ignore" });

      mkdirSync(path.join(tempDir, "src"), { recursive: true });
      writeFileSync(path.join(tempDir, "root.ts"), "root\n");
      writeFileSync(path.join(tempDir, "src", "app.ts"), "app\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "add files"', { cwd: tempDir, stdio: "ignore" });

      const commitHash = execSync("git rev-parse HEAD", {
        cwd: tempDir,
        encoding: "utf-8",
      }).trim();

      const result = getReviewFilesFromGit({
        source: "commit",
        commitHash,
        workingDirectory: tempDir,
        files: ["src"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("src/app.ts");
    });

    it("should throw when commitHash is missing", () => {
      writeFileSync(path.join(tempDir, "file.ts"), "content\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: "ignore" });

      expect(() =>
        getReviewFilesFromGit({
          source: "commit",
          workingDirectory: tempDir,
        }),
      ).toThrow("commitHash is required");
    });
  });

  describe("source: branch", () => {
    it("should return files changed between two branches", () => {
      writeFileSync(path.join(tempDir, "base.ts"), "base content\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "base commit"', {
        cwd: tempDir,
        stdio: "ignore",
      });

      // Get the actual default branch name (varies by git config)
      const defaultBranch = execSync("git branch --show-current", {
        cwd: tempDir,
        encoding: "utf-8",
      }).trim();

      execSync("git checkout -b feature", { cwd: tempDir, stdio: "ignore" });
      writeFileSync(path.join(tempDir, "feature.ts"), "feature code\n");
      writeFileSync(path.join(tempDir, "base.ts"), "updated base\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "feature work"', {
        cwd: tempDir,
        stdio: "ignore",
      });

      const result = getReviewFilesFromGit({
        source: "branch",
        base: defaultBranch,
        head: "feature",
        workingDirectory: tempDir,
      });

      expect(result).toHaveLength(2);

      const newFile = result.find((f) => f.path === "feature.ts");
      expect(newFile).toBeDefined();
      expect(newFile?.content).toBe("feature code\n");
      expect(newFile?.oldContent).toBeUndefined();

      const modifiedFile = result.find((f) => f.path === "base.ts");
      expect(modifiedFile).toBeDefined();
      expect(modifiedFile?.content).toBe("updated base\n");
      expect(modifiedFile?.oldContent).toBe("base content\n");
    });

    it("should throw when base or head is missing", () => {
      expect(() =>
        getReviewFilesFromGit({
          source: "branch",
          base: "main",
          workingDirectory: tempDir,
        }),
      ).toThrow("base and head are required");
    });
  });
});
