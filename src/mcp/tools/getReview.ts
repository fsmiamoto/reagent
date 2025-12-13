import type { GetReviewInput, GetReviewResult, ReviewResult } from '../../shared/types.js';
import { getPort } from '../../config.js';

/**
 * Get review status/results via the HTTP API.
 */
export async function getReview(input: GetReviewInput): Promise<ReviewResult | GetReviewResult> {
  const { sessionId, wait = true } = input;
  const port = getPort();
  const apiUrl = `http://localhost:${port}/api`;

  console.error(
    `[Reagent] Getting review ${sessionId} via API (wait: ${wait})`
  );

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await fetch(`${apiUrl}/sessions/${sessionId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Review session not found: ${sessionId}. ` +
            `Session may have been completed and cleaned up, or the ID is invalid.`
          );
        }
        throw new Error(`API error: ${response.statusText}`);
      }

      const session = (await response.json()) as {
        id: string;
        status: 'pending' | 'approved' | 'changes_requested' | 'cancelled';
        generalFeedback: string;
        comments: Array<{
          id: string;
          filePath: string;
          startLine: number;
          endLine: number;
          text: string;
          createdAt: Date;
        }>;
      };

      if (!wait || session.status !== 'pending') {
        const result: GetReviewResult = {
          status: session.status,
        };

        if (session.status === 'approved' || session.status === 'changes_requested') {
          result.generalFeedback = session.generalFeedback;
          result.comments = session.comments;
          result.timestamp = new Date();

          console.error(
            `[Reagent] Review completed: ${session.status}, ` +
            `${session.comments.length} comment(s)`
          );
        } else {
          console.error(`[Reagent] Review status: ${session.status}`);
        }

        return result;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error('[Reagent] Failed to get review:', error);
    throw error;
  }
}
