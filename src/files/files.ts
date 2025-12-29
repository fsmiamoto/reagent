import { readFileSync, existsSync, statSync } from "fs";
import * as path from "path";
import type { ReviewFile } from "../models/domain";
import type { ReviewInput } from "../models/api";
import { resolveReviewSource } from "../models/api";
import { getLanguageFromPath } from "../utils/language";
import { getReviewFilesFromGit } from "../git/git";

/**
 * Get review files from local filesystem
 */
export function getLocalFiles(files: string[], cwd?: string): ReviewFile[] {
  const workingDir = cwd || process.cwd();
  const reviewFiles: ReviewFile[] = [];

  for (const filePath of files) {
    // Use the path as-is if absolute, otherwise join with working directory
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(workingDir, filePath);

    if (!existsSync(fullPath)) {
      console.warn(`[Reagent] File not found: ${fullPath}`);
      continue;
    }

    const stats = statSync(fullPath);
    if (!stats.isFile()) {
      console.warn(`[Reagent] Not a file: ${fullPath}`);
      continue;
    }

    try {
      const content = readFileSync(fullPath, "utf-8");

      reviewFiles.push({
        path: filePath,
        content,
        // For local files, we don't have "old content" unless we want to try to read from git
        // For now, we treat them as "new" files (added)
        oldContent: undefined,
        language: getLanguageFromPath(filePath),
      });
    } catch (error) {
      console.error(`[Reagent] Failed to read file ${fullPath}:`, error);
    }
  }

  return reviewFiles;
}

/**
 * Extract review files from input, determining the source and fetching files accordingly
 */
export function extractReviewFiles(input: ReviewInput): {
  files: ReviewFile[];
  title?: string;
  description?: string;
} {
  const source = resolveReviewSource(input);
  const sourceLabel = input.source ? source : `${source} (auto-detected)`;
  console.error(`[Reagent] Using source: ${sourceLabel}`);

  const reviewInput = { ...input, source };
  let files: ReviewFile[];

  if (source === "local") {
    if (!reviewInput.files || reviewInput.files.length === 0) {
      throw new Error("Files must be specified for local review");
    }
    files = getLocalFiles(reviewInput.files, reviewInput.workingDirectory);
  } else {
    files = getReviewFilesFromGit(reviewInput);
  }

  const title = reviewInput.title;
  const description = reviewInput.description;

  return { files, title, description };
}
