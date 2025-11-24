import { sessionStore } from '../../core/SessionStore.js';
import type { GetReviewInput, GetReviewResult, ReviewResult } from '../../shared/types.js';

export async function getReview(input: GetReviewInput): Promise<ReviewResult | GetReviewResult> {
  const { sessionId, wait = true } = input;

  // Retrieve session from store
  const session = sessionStore.get(sessionId);

  if (!session) {
    throw new Error(
      `Review session not found: ${sessionId}. ` +
      `Session may have been completed and cleaned up, or the ID is invalid.`
    );
  }

  console.error(
    `[Reagent] Retrieving review ${sessionId} ` +
    `(status: ${session.status}, wait: ${wait})`
  );

  // Non-blocking mode: return current state immediately
  if (!wait) {
    const result: GetReviewResult = {
      status: session.status,
    };

    // Only include feedback/comments if review is completed
    if (session.status === 'approved' || session.status === 'changes_requested') {
      result.generalFeedback = session.generalFeedback;
      result.comments = session.comments;
      result.timestamp = new Date();
    }

    console.error(`[Reagent] Returning current state: ${session.status}`);
    return result;
  }

  // Blocking mode: wait for completion
  console.error('[Reagent] Waiting for review to complete...');

  // If already completed, return immediately
  if (session.status !== 'pending') {
    const result: ReviewResult = {
      status: session.status as 'approved' | 'changes_requested',
      generalFeedback: session.generalFeedback,
      comments: session.comments,
      timestamp: new Date(),
    };

    console.error(`[Reagent] Review already completed: ${session.status}`);
    return result;
  }

  try {
    // Block here until review completes
    // The promise will resolve when session.complete() is called
    // or reject when session.cancel() is called
    const result = await session.completionPromise;

    console.error(
      `[Reagent] Review completed with status: ${result.status}, ` +
      `${result.comments.length} comment(s)`
    );

    return result;
  } catch (error) {
    // Review was cancelled or timed out
    console.error('[Reagent] Review cancelled or timed out:', error);
    throw error;
  }
}
