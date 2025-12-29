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
  createdAt: Date;
}

export type ReviewStatus =
  | "pending"
  | "approved"
  | "changes_requested"
  | "cancelled";

export interface ReviewSessionDetails {
  id: string;
  title?: string;
  description?: string;
  files: ReviewFile[];
  comments: ReviewComment[];
  generalFeedback: string;
  status: ReviewStatus;
  createdAt: Date;
}

export interface ReviewResult {
  status: "approved" | "changes_requested";
  generalFeedback: string;
  comments: ReviewComment[];
  timestamp: Date;
}

export type ReviewSource = "uncommitted" | "commit" | "branch" | "local";
