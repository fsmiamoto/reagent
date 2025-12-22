import { ReviewSession } from '../models/reviewSession';

export interface IReviewSessionStore {
  set(session: ReviewSession): void;
  get(sessionId: string): ReviewSession | undefined;
  has(sessionId: string): boolean;
  delete(sessionId: string): boolean;
  getAllSessions(): ReviewSession[];
  clear(): void;
}

export class InMemoryReviewSessionStore implements IReviewSessionStore {
  private sessions = new Map<string, ReviewSession>();

  set(session: ReviewSession): void {
    this.sessions.set(session.id, session);
  }

  get(sessionId: string): ReviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  getAllSessions(): ReviewSession[] {
    return Array.from(this.sessions.values());
  }

  clear(): void {
    // Cancel all pending sessions before clearing
    for (const session of this.sessions.values()) {
      if (session.status === 'pending') {
        session.cancel('Server shutting down');
      }
    }
    this.sessions.clear();
  }
}

export const defaultSessionStore: IReviewSessionStore = new InMemoryReviewSessionStore();
