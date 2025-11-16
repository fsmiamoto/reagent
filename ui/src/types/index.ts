/**
 * TypeScript types for the UI (mirrors server types)
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
  createdAt: string | Date;
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
  createdAt: string | Date;
}
