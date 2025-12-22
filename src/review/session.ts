import { v4 as uuidv4 } from 'uuid';
import type {
  ReviewFile,
  ReviewComment,
  ReviewResult,
  ReviewStatus,
  ReviewSessionDetails,
} from '../models/domain';

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

  public readonly completionPromise: Promise<ReviewResult>;

  constructor(
    files: ReviewFile[],
    title?: string,
    description?: string,
  ) {
    this.id = uuidv4();
    this.title = title;
    this.description = description;
    this.files = files;
    this.createdAt = new Date();

    this.completionPromise = new Promise<ReviewResult>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });
  }

  addComment(filePath: string, startLine: number, endLine: number, side: 'old' | 'new', text: string): ReviewComment {
    const comment: ReviewComment = {
      id: uuidv4(),
      filePath,
      startLine,
      endLine,
      side,
      text,
      createdAt: new Date(),
    };

    this.comments.push(comment);
    return comment;
  }

  complete(status: 'approved' | 'changes_requested', generalFeedback: string = ''): void {
    if (this.status !== 'pending') {
      throw new Error('Review has already been completed or cancelled');
    }

    this.status = status;
    this.generalFeedback = generalFeedback;

    const result: ReviewResult = {
      status,
      generalFeedback,
      comments: this.comments,
      timestamp: new Date(),
    };

    this.resolvePromise(result);
  }

  cancel(reason: string = 'Review cancelled'): void {
    if (this.status !== 'pending') {
      return;
    }

    this.status = 'cancelled';

    this.rejectPromise(new Error(reason));
  }

  toJSON(): ReviewSessionDetails {
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
