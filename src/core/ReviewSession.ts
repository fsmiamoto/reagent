import { v4 as uuidv4 } from 'uuid';
import type {
  ReviewFile,
  ReviewComment,
  ReviewResult,
  ReviewStatus,
  ReviewSession as IReviewSession,
} from '../shared/types.js';

/**
 * Represents a code review session with deferred promise pattern
 */
export class ReviewSession {
  public readonly id: string;
  public readonly title?: string;
  public readonly description?: string;
  public readonly files: ReviewFile[];
  public readonly comments: ReviewComment[] = [];
  public generalFeedback: string = '';
  public status: ReviewStatus = 'pending';
  public readonly createdAt: Date;

  private resolvePromise!: (value: ReviewResult) => void;
  private rejectPromise!: (reason: any) => void;
  private timeoutId?: NodeJS.Timeout;

  /**
   * The promise that the MCP tool will await
   * This blocks the agent until the review is complete
   */
  public readonly completionPromise: Promise<ReviewResult>;

  constructor(
    files: ReviewFile[],
    title?: string,
    description?: string,
    timeoutMs: number = 30 * 60 * 1000 // 30 minutes default
  ) {
    this.id = uuidv4();
    this.title = title;
    this.description = description;
    this.files = files;
    this.createdAt = new Date();

    // Deferred promise pattern - capture resolve/reject externally
    this.completionPromise = new Promise<ReviewResult>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });

    // Set timeout to auto-reject if review takes too long
    this.timeoutId = setTimeout(() => {
      this.cancel('Review timed out');
    }, timeoutMs);
  }

  /**
   * Add a comment to a specific line in a file
   */
  addComment(filePath: string, lineNumber: number, text: string): ReviewComment {
    const comment: ReviewComment = {
      id: uuidv4(),
      filePath,
      lineNumber,
      text,
      createdAt: new Date(),
    };

    this.comments.push(comment);
    return comment;
  }

  /**
   * Complete the review with approval or change requests
   * This resolves the promise and unblocks the agent
   */
  complete(status: 'approved' | 'changes_requested', generalFeedback: string = ''): void {
    if (this.status !== 'pending') {
      throw new Error('Review has already been completed or cancelled');
    }

    this.status = status;
    this.generalFeedback = generalFeedback;

    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    const result: ReviewResult = {
      status,
      generalFeedback,
      comments: this.comments,
      timestamp: new Date(),
    };

    // Resolve the promise - this unblocks the MCP tool
    this.resolvePromise(result);
  }

  /**
   * Cancel the review (e.g., on timeout or user closing browser)
   */
  cancel(reason: string = 'Review cancelled'): void {
    if (this.status !== 'pending') {
      return; // Already completed
    }

    this.status = 'cancelled';

    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Reject the promise - this will error in the MCP tool
    this.rejectPromise(new Error(reason));
  }

  /**
   * Get the session data for serialization
   */
  toJSON(): IReviewSession {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      files: this.files,
      comments: this.comments,
      generalFeedback: this.generalFeedback,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}
