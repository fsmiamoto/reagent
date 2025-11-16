/**
 * Shared TypeScript types used across the Reagent application
 */

export interface ReviewFile {
  path: string;
  content: string;
  oldContent?: string;
  language?: string;
}

export interface ReviewComment {
  id: string;
  filePath: string;
  lineNumber: number;
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

export type GitSource = 'uncommitted' | 'commit' | 'branch';

/**
 * Git-based review input
 */
export interface GitReviewInput {
  files?: string[]; // Array of file paths (optional: reviews all changes when omitted)
  source?: GitSource;
  commitHash?: string; // For source: 'commit'
  base?: string; // For source: 'branch'
  head?: string; // For source: 'branch'
  title?: string;
  description?: string;
  workingDirectory?: string; // Optional working directory, defaults to cwd
}

export type AskForReviewInput = GitReviewInput;

export interface AddCommentRequest {
  filePath: string;
  lineNumber: number;
  text: string;
}

export interface CompleteReviewRequest {
  status: 'approved' | 'changes_requested';
  generalFeedback: string;
}

/**
 * Resolve which git source should be used based on provided fields
 */
export function resolveGitSource(input: GitReviewInput): GitSource {
  if (input.source) {
    return input.source;
  }
  if (input.commitHash) {
    return 'commit';
  }
  if (input.base || input.head) {
    return 'branch';
  }
  return 'uncommitted';
}
