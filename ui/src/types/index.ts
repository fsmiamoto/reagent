/**
 * TypeScript types for the UI (mirrors server types)
 */

export interface ReviewFile {
  path: string;
  content: string;
  oldContent?: string;
  language?: string;
}

export type CommentSide = "old" | "new";

export interface ReviewComment {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  side: CommentSide;
  text: string;
  createdAt: string | Date;
}

export type ReviewStatus =
  | "pending"
  | "approved"
  | "changes_requested"
  | "cancelled";

/**
 * Lightweight session summary for dashboard listing
 */
export interface SessionSummary {
  id: string;
  status: ReviewStatus;
  filesCount: number;
  title?: string;
  description?: string;
  createdAt: string | Date;
}

export interface ReviewSession {
  id: string;
  title?: string;
  description?: string;
  files: ReviewFile[];
  comments: ReviewComment[];
  generalFeedback: string;
  status: ReviewStatus;
  createdAt: string | Date;
}
