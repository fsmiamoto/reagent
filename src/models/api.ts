import type {
  CommentSide,
  ReviewComment,
  ReviewSource,
  ReviewStatus,
} from "@src/models/domain";

export interface ReviewInput {
  files?: string[];
  source?: ReviewSource;
  commitHash?: string;
  base?: string;
  head?: string;
  title?: string;
  description?: string;
  workingDirectory?: string;
}

export type AskForReviewInput = ReviewInput;

export interface CreateReviewInput extends ReviewInput {
  openBrowser?: boolean;
  /** Internal: host for URL generation, not exposed in MCP schema */
  _host?: string;
}

export interface CreateReviewResult {
  sessionId: string;
  reviewUrl: string;
  filesCount: number;
  title?: string;
}

/**
 * Input for get_review tool
 */
export interface GetReviewInput {
  sessionId: string;
  wait?: boolean;
}

/**
 * Output from get_review tool (non-blocking mode)
 */
export interface GetReviewResult {
  status: ReviewStatus;
  generalFeedback?: string;
  comments?: ReviewComment[];
  timestamp?: Date;
}

/**
 * Response from GET /sessions/:id endpoint
 */
export interface GetSessionResponse {
  id: string;
  status: string;
  generalFeedback: string;
  comments: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    text: string;
  }>;
}

export interface AddCommentRequest {
  filePath: string;
  startLine: number;
  endLine: number;
  side: CommentSide;
  text: string;
}

export interface CompleteReviewRequest {
  status: "approved" | "changes_requested";
  generalFeedback: string;
}

/**
 * Resolve which source should be used based on provided fields
 */
export function resolveReviewSource(input: ReviewInput): ReviewSource {
  if (input.source) {
    return input.source;
  }
  if (input.commitHash) {
    return "commit";
  }
  if (input.base || input.head) {
    return "branch";
  }
  return "uncommitted";
}
