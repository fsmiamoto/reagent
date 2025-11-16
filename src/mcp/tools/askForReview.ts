import open from 'open';
import { ReviewSession } from '../../core/ReviewSession.js';
import { sessionStore } from '../../core/SessionStore.js';
import { getReviewFilesFromGit, getGitSummary } from '../../utils/git.js';
import type { AskForReviewInput, ReviewResult, ReviewFile } from '../../shared/types.js';
import { resolveGitSource } from '../../shared/types.js';

/**
 * Process input to get review files from git
 */
function getReviewFiles(input: AskForReviewInput): {
  files: ReviewFile[];
  title?: string;
  description?: string;
} {
  const gitSource = resolveGitSource(input);
  const sourceLabel = input.source ? gitSource : `${gitSource} (auto-detected)`;
  console.error(`[Reagent] Using git source: ${sourceLabel}`);

  const gitInput = { ...input, source: gitSource };
  const files = getReviewFilesFromGit(gitInput);

  // Generate title if not provided
  const title = gitInput.title || getGitSummary(gitInput);
  const description = gitInput.description;

  return { files, title, description };
}

/**
 * The ask_for_review tool implementation
 *
 * This is the core of Reagent - it creates a review session, opens the browser,
 * and BLOCKS until the user completes their review.
 *
 * Supports git-based reviews using your local repository.
 */
export async function askForReview(input: AskForReviewInput): Promise<ReviewResult> {
  try {
    // Process input to get review files from git
    const { files, title, description } = getReviewFiles(input);

    console.error(`[Reagent] Creating review session for ${files.length} file(s)`);

    // Create a new review session with deferred promise
    const session = new ReviewSession(files, title, description);

    // Store the session so the web UI can access it
    sessionStore.set(session);

    // Get the web server port from environment or use default
    const port = process.env.REAGENT_PORT || 3636;
    const reviewUrl = `http://localhost:${port}/review/${session.id}`;

    console.error(`[Reagent] Opening browser: ${reviewUrl}`);

    try {
      // Open the review UI in the default browser
      await open(reviewUrl);
    } catch (error) {
      console.error('[Reagent] Failed to open browser:', error);
      // Clean up session on error
      sessionStore.delete(session.id);
      throw new Error('Failed to open browser for code review');
    }

    console.error('[Reagent] Waiting for review to complete...');

    // BLOCK HERE until the user completes the review
    // The promise will be resolved when session.complete() is called
    // or rejected when session.cancel() is called or timeout occurs
    const result = await session.completionPromise;

    console.error(
      `[Reagent] Review completed with status: ${result.status}, ` +
      `${result.comments.length} comment(s)`
    );

    // Clean up the session
    sessionStore.delete(session.id);

    return result;
  } catch (error) {
    // Review was cancelled or timed out or git failed
    console.error('[Reagent] Review failed:', error);

    throw error;
  }
}
