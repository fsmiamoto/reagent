import type { IReviewSessionStore } from './store';
import type { ReviewFile } from '../models/domain';
import { ReviewSession } from './session';
import { defaultSessionStore } from './store';

export interface IReviewService {
  createSession(files: ReviewFile[], title?: string, description?: string): ReviewSession;
  getSession(id: string): ReviewSession | undefined;
  listSessions(): ReviewSession[];
}

export class ReviewService implements IReviewService {
  constructor(private readonly store: IReviewSessionStore) { }

  createSession(files: ReviewFile[], title?: string, description?: string): ReviewSession {
    if (files.length === 0) {
      throw new Error('No files to review. Check your source and file filters.');
    }

    console.error(`[Reagent] Creating review session for ${files.length} file(s)`);

    const session = new ReviewSession(files, title, description);
    this.store.set(session);

    console.error(`[Reagent] Review session created: ${session.id}`);
    return session;
  }

  getSession(id: string): ReviewSession | undefined {
    return this.store.get(id);
  }

  listSessions(): ReviewSession[] {
    return this.store.getAllSessions();
  }
}

// Default instance with real session store
export const reviewService: IReviewService = new ReviewService(defaultSessionStore);
