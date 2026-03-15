import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import * as path from "path";
import { getReviewFilesFromGit, getGitSummary } from "@src/git/git";

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

  describe("file filter edge cases", () => {
    it("should not treat empty string entries as wildcards", () => {
      mkdirSync(path.join(tempDir, "src"), { recursive: true });
      writeFileSync(path.join(tempDir, "src", "app.ts"), "app\n");
      writeFileSync(path.join(tempDir, "root.ts"), "root\n");

      // Empty string entry should be skipped, not match all files
      expect(() =>
        getReviewFilesFromGit({
          source: "uncommitted",
          workingDirectory: tempDir,
          files: [""],
        }),
      ).toThrow("No changes found");
    });

    it("should not treat slash-only entries as wildcards", () => {
      writeFileSync(path.join(tempDir, "file.ts"), "content\n");

      // "///" normalizes to "" which should be skipped
      expect(() =>
        getReviewFilesFromGit({
          source: "uncommitted",
          workingDirectory: tempDir,
          files: ["///"],
        }),
      ).toThrow("No changes found");
    });

    it("should skip empty entries but still match valid ones", () => {
      mkdirSync(path.join(tempDir, "src"), { recursive: true });
      mkdirSync(path.join(tempDir, "lib"), { recursive: true });
      writeFileSync(path.join(tempDir, "src", "app.ts"), "app\n");
      writeFileSync(path.join(tempDir, "lib", "util.ts"), "util\n");

      // Empty string is skipped; only "src" entry matches
      const result = getReviewFilesFromGit({
        source: "uncommitted",
        workingDirectory: tempDir,
        files: ["", "src"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("src/app.ts");
    });

    it("should skip slash-only entries but still match valid ones", () => {
      mkdirSync(path.join(tempDir, "src"), { recursive: true });
      writeFileSync(path.join(tempDir, "src", "app.ts"), "app\n");
      writeFileSync(path.join(tempDir, "other.ts"), "other\n");

      const result = getReviewFilesFromGit({
        source: "uncommitted",
        workingDirectory: tempDir,
        files: ["///", "src"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("src/app.ts");
    });
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

  describe("deleted files", () => {
    it("should exclude deleted files from uncommitted changes", () => {
      writeFileSync(path.join(tempDir, "keep.ts"), "keep\n");
      writeFileSync(path.join(tempDir, "remove.ts"), "remove\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "initial"', { cwd: tempDir, stdio: "ignore" });

      // Delete one file, modify the other
      unlinkSync(path.join(tempDir, "remove.ts"));
      writeFileSync(path.join(tempDir, "keep.ts"), "updated\n");

      const result = getReviewFilesFromGit({
        source: "uncommitted",
        workingDirectory: tempDir,
      });

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("keep.ts");
      expect(result[0].content).toBe("updated\n");
    });

    it("should exclude deleted files from commit source", () => {
      writeFileSync(path.join(tempDir, "a.ts"), "a\n");
      writeFileSync(path.join(tempDir, "b.ts"), "b\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "add files"', { cwd: tempDir, stdio: "ignore" });

      // Commit a deletion
      execSync("git rm b.ts", { cwd: tempDir, stdio: "ignore" });
      writeFileSync(path.join(tempDir, "a.ts"), "a updated\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "delete b"', { cwd: tempDir, stdio: "ignore" });

      const commitHash = execSync("git rev-parse HEAD", {
        cwd: tempDir,
        encoding: "utf-8",
      }).trim();

      const result = getReviewFilesFromGit({
        source: "commit",
        commitHash,
        workingDirectory: tempDir,
      });

      // Only the modified file should appear; deleted file is excluded
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("a.ts");
    });

    it("should return empty array when only deleted files exist in a commit", () => {
      writeFileSync(path.join(tempDir, "only.ts"), "content\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "add"', { cwd: tempDir, stdio: "ignore" });

      execSync("git rm only.ts", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "remove all"', { cwd: tempDir, stdio: "ignore" });

      const commitHash = execSync("git rev-parse HEAD", {
        cwd: tempDir,
        encoding: "utf-8",
      }).trim();

      // Deleted files are collected but filtered out by convertToReviewFiles;
      // the "No changes found" check happens before filtering, so no throw
      const result = getReviewFilesFromGit({
        source: "commit",
        commitHash,
        workingDirectory: tempDir,
      });

      expect(result).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should throw when not a git repository", () => {
      // Must be outside tempDir (which has git init) since git traverses upward
      const tmpBase = process.env.TMPDIR || "/tmp";
      const nonGitDir = mkdtempSync(path.join(tmpBase, "reagent-no-git-"));
      try {
        expect(() =>
          getReviewFilesFromGit({
            source: "uncommitted",
            workingDirectory: nonGitDir,
          }),
        ).toThrow("Not a git repository");
      } finally {
        rmSync(nonGitDir, { recursive: true, force: true });
      }
    });

    it("should throw when there are no uncommitted changes", () => {
      // Empty repo with initial commit but clean working tree
      writeFileSync(path.join(tempDir, "file.ts"), "content\n");
      execSync("git add -A", { cwd: tempDir, stdio: "ignore" });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: "ignore" });

      expect(() =>
        getReviewFilesFromGit({
          source: "uncommitted",
          workingDirectory: tempDir,
        }),
      ).toThrow("No changes found");
    });
  });
});

describe("getGitSummary", () => {
  it('should return "Uncommitted changes" for uncommitted source', () => {
    expect(getGitSummary({ source: "uncommitted" })).toBe(
      "Uncommitted changes",
    );
  });

  it("should return abbreviated commit hash for commit source", () => {
    expect(
      getGitSummary({ source: "commit", commitHash: "abc1234567890" }),
    ).toBe("Commit abc1234");
  });

  it("should return base...head for branch source", () => {
    expect(
      getGitSummary({ source: "branch", base: "main", head: "feature" }),
    ).toBe("main...feature");
  });

  it("should auto-detect source from input fields", () => {
    // No source specified, but commitHash provided → commit
    expect(getGitSummary({ commitHash: "deadbeef1234" })).toBe(
      "Commit deadbee",
    );

    // No source, but base/head → branch
    expect(getGitSummary({ base: "dev", head: "release" })).toBe(
      "dev...release",
    );

    // No source, no fields → uncommitted
    expect(getGitSummary({})).toBe("Uncommitted changes");
  });
});
