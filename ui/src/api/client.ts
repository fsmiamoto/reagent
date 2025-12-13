import type { ReviewSession, ReviewComment, SessionSummary } from '../types';

const API_BASE = '/api';

/**
 * API client for communicating with the Reagent backend
 */
export const api = {
  /**
   * Fetch all review sessions for the dashboard
   */
  async getSessions(): Promise<SessionSummary[]> {
    const response = await fetch(`${API_BASE}/sessions`);

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Fetch a review session by ID
   */
  async getSession(sessionId: string): Promise<ReviewSession> {
    if (sessionId === 'demo') {
      return {
        id: 'demo',
        title: 'Demo Review',
        description: 'Testing diff rendering',
        status: 'pending',
        createdAt: new Date().toISOString(),
        generalFeedback: '',
        comments: [],
        files: [
          {
            path: 'src/components/Demo.tsx',
            language: 'typescript',
            content: 'import React from "react";\n\nexport const Demo = () => {\n  return <div>Hello World</div>;\n};\n',
            oldContent: 'import React from "react";\n\nexport const Demo = () => {\n  return <div>Hello</div>;\n};\n',
          },
          {
            path: 'package-lock.json',
            language: 'json',
            content: '{\n  "name": "demo",\n  "version": "1.0.0"\n}\n',
            oldContent: '{\n  "name": "demo",\n  "version": "0.0.0"\n}\n',
          }
        ]
      };
    }

    const response = await fetch(`${API_BASE}/sessions/${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Add a comment to a line or range of lines
   */
  async addComment(
    sessionId: string,
    filePath: string,
    startLine: number,
    endLine: number,
    text: string
  ): Promise<ReviewComment> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath,
        startLine,
        endLine,
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
