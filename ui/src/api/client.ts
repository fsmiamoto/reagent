import type { ReviewSession, ReviewComment, SessionSummary } from "../types";

const API_BASE = "/api";

async function extractErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => undefined);
  const detail =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
      ? body.error
      : response.statusText;
  return `${fallback}: ${detail}`;
}

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
      throw new Error(
        await extractErrorMessage(response, "Failed to fetch sessions"),
      );
    }

    return response.json();
  },

  /**
   * Fetch a review session by ID
   */
  async getSession(sessionId: string): Promise<ReviewSession> {
    if (sessionId === "demo") {
      return {
        id: "demo",
        title: "Demo Review",
        description: "Testing diff rendering",
        status: "pending",
        createdAt: new Date().toISOString(),
        generalFeedback: "",
        comments: [],
        files: [
          {
            path: "src/components/Demo.tsx",
            language: "typescript",
            content:
              'import React from "react";\n\nexport const Demo = () => {\n  return <div>Hello World</div>;\n};\n',
            oldContent:
              'import React from "react";\n\nexport const Demo = () => {\n  return <div>Hello</div>;\n};\n',
          },
          {
            path: "package-lock.json",
            language: "json",
            content: '{\n  "name": "demo",\n  "version": "1.0.0"\n}\n',
            oldContent: '{\n  "name": "demo",\n  "version": "0.0.0"\n}\n',
          },
        ],
      };
    }

    const response = await fetch(`${API_BASE}/sessions/${sessionId}`);

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, "Failed to fetch session"),
      );
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
    side: "old" | "new",
    text: string,
  ): Promise<ReviewComment> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filePath,
        startLine,
        endLine,
        side,
        text,
      }),
    });

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, "Failed to add comment"),
      );
    }

    return response.json();
  },

  /**
   * Delete a comment
   */
  async deleteComment(sessionId: string, commentId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/sessions/${sessionId}/comments/${commentId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, "Failed to delete comment"),
      );
    }
  },

  /**
   * Complete the review (approve or request changes)
   * This resolves the promise and unblocks the agent!
   */
  async completeReview(
    sessionId: string,
    status: "approved" | "changes_requested",
    generalFeedback: string,
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        generalFeedback,
      }),
    });

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, "Failed to complete review"),
      );
    }
  },

  /**
   * Cancel the review
   */
  async cancelReview(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/cancel`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, "Failed to cancel review"),
      );
    }
  },
};
