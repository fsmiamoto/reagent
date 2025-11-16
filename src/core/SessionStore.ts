import { ReviewSession } from './ReviewSession.js';

/**
 * In-memory store for active review sessions
 *
 * In a production system, this could be backed by Redis or a database
 * for session persistence, but for the MVP an in-memory Map is sufficient.
 */
export class SessionStore {
  private sessions = new Map<string, ReviewSession>();

  /**
   * Add a new session to the store
   */
  set(session: ReviewSession): void {
    this.sessions.set(session.id, session);
  }

  /**
   * Retrieve a session by ID
   */
  get(sessionId: string): ReviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Check if a session exists
   */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Remove a session from the store
   */
  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): ReviewSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all sessions (useful for cleanup/testing)
   */
  clear(): void {
    // Cancel all pending sessions before clearing
    for (const session of this.sessions.values()) {
      if (session.status === 'pending') {
        session.cancel('Server shutting down');
      }
    }
    this.sessions.clear();
  }

  /**
   * Clean up old completed sessions
   * Call this periodically to prevent memory leaks
   */
  cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = new Date().getTime();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      const age = now - session.createdAt.getTime();

      // Remove completed/cancelled sessions older than maxAge
      if (session.status !== 'pending' && age > maxAgeMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Export a singleton instance
export const sessionStore = new SessionStore();
