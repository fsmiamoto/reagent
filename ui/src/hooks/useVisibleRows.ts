import { useMemo } from "react";
import { DiffRow } from "./useDiff";
import { ReviewComment, ReviewFile } from "../types";

interface UseVisibleRowsOptions {
  diffRows: DiffRow[];
  showAllLines: boolean;
  comments: ReviewComment[];
  file: ReviewFile;
  contextLines?: number;
  defaultVisibleLines?: number;
}

export const useVisibleRows = ({
  diffRows,
  showAllLines,
  comments,
  file,
  contextLines = 3,
  defaultVisibleLines = 5,
}: UseVisibleRowsOptions) => {
  return useMemo(() => {
    if (showAllLines) return diffRows;

    const visibleIndices = new Set<number>();

    // Add lines around changes
    diffRows.forEach((row, index) => {
      if (row.type !== "unchanged") {
        const start = Math.max(0, index - contextLines);
        const end = Math.min(diffRows.length - 1, index + contextLines);
        for (let i = start; i <= end; i++) {
          visibleIndices.add(i);
        }
      }
    });

    // Add lines around comments (including all lines within range)
    const fileComments = comments.filter((c) => c.filePath === file.path);
    fileComments.forEach((comment) => {
      // Find rows for all lines in the comment range
      for (let line = comment.startLine; line <= comment.endLine; line++) {
        const rowIndex = diffRows.findIndex((r) => r.newLineNumber === line);
        if (rowIndex !== -1) {
          const start = Math.max(0, rowIndex - contextLines);
          const end = Math.min(diffRows.length - 1, rowIndex + contextLines);
          for (let i = start; i <= end; i++) {
            visibleIndices.add(i);
          }
        }
      }
    });

    // If no changes/comments, show first few lines
    if (visibleIndices.size === 0) {
      const limit = Math.min(diffRows.length, defaultVisibleLines);
      Array.from({ length: limit }).forEach((_, i) => visibleIndices.add(i));
    }

    return diffRows.filter((_, index) => visibleIndices.has(index));
  }, [
    diffRows,
    showAllLines,
    comments,
    file.path,
    contextLines,
    defaultVisibleLines,
  ]);
};
