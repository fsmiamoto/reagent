import { ReviewSession } from "./session";

export const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

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
    this.sweepExpired();
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
    this.sweepExpired();
    return Array.from(this.sessions.values());
  }

  clear(): void {
    // Cancel all pending sessions before clearing
    for (const session of this.sessions.values()) {
      if (session.status === "pending") {
        session.cancel("Server shutting down");
      }
    }
    this.sessions.clear();
  }

  private sweepExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (
        session.status !== "pending" &&
        session.completedAt &&
        now - session.completedAt.getTime() > SESSION_TTL_MS
      ) {
        this.sessions.delete(id);
      }
    }
  }
}

export const defaultSessionStore: IReviewSessionStore =
  new InMemoryReviewSessionStore();
