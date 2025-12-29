import { execSync } from "child_process";
import { readFileSync } from "fs";
import * as path from "path";
import type { ReviewFile } from "../models/domain";
import { resolveReviewSource, type ReviewInput } from "../models/api";
import { getLanguageFromPath } from "../utils/language";

interface GitFileChange {
  path: string;
  status: "added" | "modified" | "deleted";
  oldContent?: string;
  newContent?: string;
}

function execGit(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large files
    });
  } catch (error: any) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

export function isGitRepository(cwd?: string): boolean {
  try {
    execGit("git rev-parse --git-dir", cwd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file content at a specific git reference
 */
function getFileContent(
  filePath: string,
  ref: string,
  cwd?: string,
): string | null {
  try {
    return execGit(`git show ${ref}:${filePath}`, cwd);
  } catch {
    // File might not exist at this ref
    return null;
  }
}

/**
 * Get current working tree content for a file
 */
function getWorkingTreeContent(filePath: string, cwd?: string): string | null {
  try {
    const fullPath = path.join(cwd || process.cwd(), filePath);
    return readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Get list of changed files for uncommitted changes
 */
function shouldIncludeFile(
  filePath: string,
  specifiedFiles?: string[],
): boolean {
  if (!specifiedFiles || specifiedFiles.length === 0) {
    return true;
  }

  return specifiedFiles.some((entry) => {
    if (!entry) {
      return true;
    }

    const normalized = entry.replace(/\/+$/, "");

    if (!normalized) {
      return true;
    }

    if (filePath === normalized) {
      return true;
    }

    return filePath.startsWith(`${normalized}/`);
  });
}

function getUncommittedFiles(
  specifiedFiles?: string[],
  cwd?: string,
): GitFileChange[] {
  const changes: GitFileChange[] = [];

  // Get staged, unstaged, and untracked files (including in subdirectories)
  const statusOutput = execGit(
    "git status --porcelain=v1 --untracked-files=all",
    cwd,
  );
  const lines = statusOutput.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    const status = line.substring(0, 2);
    const filePath = line.substring(3).trim();

    // If specific files are specified, only include those
    if (!shouldIncludeFile(filePath, specifiedFiles)) {
      continue;
    }

    let changeStatus: "added" | "modified" | "deleted";
    if (status.includes("D")) {
      changeStatus = "deleted";
    } else if (status.includes("A") || status.includes("?")) {
      changeStatus = "added";
    } else {
      changeStatus = "modified";
    }

    const newContent =
      changeStatus !== "deleted" ? getWorkingTreeContent(filePath, cwd) : null;

    // Skip entries where content is null (directories or unreadable files)
    if (newContent === null) {
      continue;
    }

    const oldContent =
      changeStatus !== "added" ? getFileContent(filePath, "HEAD", cwd) : null;

    changes.push({
      path: filePath,
      status: changeStatus,
      oldContent: oldContent ?? undefined,
      newContent: newContent ?? undefined,
    });
  }

  return changes;
}

/**
 * Get list of changed files in a specific commit
 */
function getCommitFiles(
  commitHash: string,
  specifiedFiles?: string[],
  cwd?: string,
): GitFileChange[] {
  const changes: GitFileChange[] = [];

  // Get list of files changed in the commit
  const diffOutput = execGit(
    `git diff-tree --no-commit-id --name-status -r ${commitHash}`,
    cwd,
  );
  const lines = diffOutput.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    const [status, filePath] = line.split("\t");

    // If specific files are specified, only include those
    if (!shouldIncludeFile(filePath, specifiedFiles)) {
      continue;
    }

    let changeStatus: "added" | "modified" | "deleted";
    if (status === "D") {
      changeStatus = "deleted";
    } else if (status === "A") {
      changeStatus = "added";
    } else {
      changeStatus = "modified";
    }

    const newContent =
      changeStatus !== "deleted"
        ? getFileContent(filePath, commitHash, cwd)
        : null;
    const oldContent =
      changeStatus !== "added"
        ? getFileContent(filePath, `${commitHash}^`, cwd)
        : null;

    changes.push({
      path: filePath,
      status: changeStatus,
      oldContent: oldContent || undefined,
      newContent: newContent || undefined,
    });
  }

  return changes;
}

/**
 * Get list of changed files between two branches/refs
 */
function getBranchFiles(
  base: string,
  head: string,
  specifiedFiles?: string[],
  cwd?: string,
): GitFileChange[] {
  const changes: GitFileChange[] = [];

  // Get list of files changed between base and head
  const diffOutput = execGit(`git diff --name-status ${base}...${head}`, cwd);
  const lines = diffOutput.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    const [status, filePath] = line.split("\t");

    // If specific files are specified, only include those
    if (!shouldIncludeFile(filePath, specifiedFiles)) {
      continue;
    }

    let changeStatus: "added" | "modified" | "deleted";
    if (status === "D") {
      changeStatus = "deleted";
    } else if (status === "A") {
      changeStatus = "added";
    } else {
      changeStatus = "modified";
    }

    const newContent =
      changeStatus !== "deleted" ? getFileContent(filePath, head, cwd) : null;
    const oldContent =
      changeStatus !== "added" ? getFileContent(filePath, base, cwd) : null;

    changes.push({
      path: filePath,
      status: changeStatus,
      oldContent: oldContent || undefined,
      newContent: newContent || undefined,
    });
  }

  return changes;
}

/**
 * Convert git changes to ReviewFile format
 */
function convertToReviewFiles(changes: GitFileChange[]): ReviewFile[] {
  return changes
    .filter((change) => typeof change.newContent === "string") // Only include entries with string content
    .map((change) => ({
      path: change.path,
      content: change.newContent as string,
      oldContent: change.oldContent,
      language: getLanguageFromPath(change.path),
    }));
}

/**
 * Main function to get review files from git
 */
export function getReviewFilesFromGit(input: ReviewInput): ReviewFile[] {
  const cwd = input.workingDirectory;

  // Verify it's a git repository
  if (!isGitRepository(cwd)) {
    throw new Error("Not a git repository");
  }

  let changes: GitFileChange[];

  const resolvedSource = resolveReviewSource(input);

  switch (resolvedSource) {
    case "uncommitted":
      changes = getUncommittedFiles(input.files, cwd);
      break;

    case "commit":
      if (!input.commitHash) {
        throw new Error("commitHash is required for source: commit");
      }
      changes = getCommitFiles(input.commitHash, input.files, cwd);
      break;

    case "branch":
      if (!input.base || !input.head) {
        throw new Error("base and head are required for source: branch");
      }
      changes = getBranchFiles(input.base, input.head, input.files, cwd);
      break;

    default:
      throw new Error(`Unknown source: ${(input as any).source}`);
  }

  if (changes.length === 0) {
    throw new Error("No changes found for the specified files");
  }

  return convertToReviewFiles(changes);
}

/**
 * Get a summary of git changes for display
 */
export function getGitSummary(input: ReviewInput): string {
  const source = resolveReviewSource(input);

  switch (source) {
    case "uncommitted":
      return "Uncommitted changes";
    case "commit":
      return `Commit ${input.commitHash?.substring(0, 7)}`;
    case "branch":
      return `${input.base}...${input.head}`;
    default:
      return "Git changes";
  }
}
