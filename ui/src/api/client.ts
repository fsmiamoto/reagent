import type { ReviewSession, ReviewComment } from '../types';

const API_BASE = '/api';

/**
 * API client for communicating with the Reagent backend
 */
export const api = {
  /**
   * Fetch a review session by ID
   */
  async getSession(sessionId: string): Promise<ReviewSession> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Add a comment to a specific line
   */
  async addComment(
    sessionId: string,
    filePath: string,
    lineNumber: number,
    text: string
  ): Promise<ReviewComment> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath,
        lineNumber,
        text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Delete a comment
   */
  async deleteComment(sessionId: string, commentId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/comments/${commentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete comment: ${response.statusText}`);
    }
  },

  /**
   * Complete the review (approve or request changes)
   * This resolves the promise and unblocks the agent!
   */
  async completeReview(
    sessionId: string,
    status: 'approved' | 'changes_requested',
    generalFeedback: string
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        generalFeedback,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to complete review: ${response.statusText}`);
    }
  },

  /**
   * Cancel the review
   */
  async cancelReview(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel review: ${response.statusText}`);
    }
  },
};
