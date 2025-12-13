/**
 * Shared TypeScript types used across the Reagent application
 */

export interface ReviewFile {
  path: string;
  content: string;
  oldContent?: string;
  language?: string;
}

export type CommentSide = 'old' | 'new';

export interface ReviewComment {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  side: CommentSide;
  text: string;
  createdAt: Date;
}

export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'cancelled';

export interface ReviewSession {
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
  status: 'approved' | 'changes_requested';
  generalFeedback: string;
  comments: ReviewComment[];
  timestamp: Date;
}

export type ReviewSource = 'uncommitted' | 'commit' | 'branch' | 'local';

/**
 * Review input
 */
export interface ReviewInput {
  files?: string[]; // Array of file paths (optional: reviews all changes when omitted)
  source?: ReviewSource;
  commitHash?: string; // For source: 'commit'
  base?: string; // For source: 'branch'
  head?: string; // For source: 'branch'
  title?: string;
  description?: string;
  workingDirectory?: string; // Optional working directory, defaults to cwd
}

export type AskForReviewInput = ReviewInput;

/**
 * Input for create_review tool
 */
export interface CreateReviewInput extends ReviewInput {
  openBrowser?: boolean; // Default: true
  /** Internal: host for URL generation, not exposed in MCP schema */
  _host?: string;
}

/**
 * Output from create_review tool
 */
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
  wait?: boolean; // Default: true - if true, blocks until complete; if false, returns current state
}

/**
 * Output from get_review tool (non-blocking mode)
 */
export interface GetReviewResult {
  status: ReviewStatus;
  generalFeedback?: string;
  comments?: ReviewComment[];
  timestamp?: Date;
  // If status is 'pending', feedback and comments are undefined
}

export interface AddCommentRequest {
  filePath: string;
  startLine: number;
  endLine: number;
  side: CommentSide;
  text: string;
}

export interface CompleteReviewRequest {
  status: 'approved' | 'changes_requested';
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
    return 'commit';
  }
  if (input.base || input.head) {
    return 'branch';
  }
  // Default to uncommitted if no specific source indicators
  return 'uncommitted';
}
