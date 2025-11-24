import open from 'open';
import { ReviewSession } from '../../core/ReviewSession.js';
import { sessionStore } from '../../core/SessionStore.js';
import type { CreateReviewInput, CreateReviewResult } from '../../shared/types.js';
import { extractReviewFiles, buildReviewUrl } from './reviewHelpers.js';

export async function createReview(input: CreateReviewInput): Promise<CreateReviewResult> {
  try {
    // Process input to get review files from git
    const { files, title, description } = extractReviewFiles(input);

    console.error(`[Reagent] Creating review session for ${files.length} file(s)`);

    if (files.length === 0) {
      throw new Error('No files to review. Check your git source and file filters.');
    }

    // Create a new review session with deferred promise
    const session = new ReviewSession(files, title, description);

    // Store the session so the web UI can access it
    sessionStore.set(session);

    const reviewUrl = buildReviewUrl(session.id);

    // Optionally open browser (can be disabled for remote scenarios)
    const shouldOpenBrowser = input.openBrowser ?? true;

    if (shouldOpenBrowser) {
      console.error(`[Reagent] Opening browser: ${reviewUrl}`);

      try {
        await open(reviewUrl);
      } catch (error) {
        console.error('[Reagent] Failed to open browser:', error);
        // Don't fail the entire operation - just log warning
        // User can still access via the returned URL
        console.error('[Reagent] You can manually open the review at:', reviewUrl);
      }
    } else {
      console.error(`[Reagent] Browser opening disabled. Access review at: ${reviewUrl}`);
    }

    // Return immediately with session info
    const result: CreateReviewResult = {
      sessionId: session.id,
      reviewUrl,
      filesCount: files.length,
      title,
    };

    console.error(`[Reagent] Review session created: ${session.id}`);

    return result;
  } catch (error) {
    console.error('[Reagent] Failed to create review:', error);
    throw error;
  }
}
