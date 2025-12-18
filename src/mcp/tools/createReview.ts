import open from 'open';
import type { CreateReviewInput, CreateReviewResult } from '../../shared/types';
import { getPort } from '../../config';

/**
 * Create a new review session via the HTTP API.
 */
export async function createReview(input: CreateReviewInput): Promise<CreateReviewResult> {
  const port = getPort();
  const apiUrl = `http://localhost:${port}/api`;
  const { openBrowser: requestedOpenBrowser, _host: _ignoredHost, ...requestPayload } = input;

  try {
    console.error(`[Reagent] Creating review via API`);

    const response = await fetch(`${apiUrl}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: string };
      throw new Error(error.error || `API error: ${response.statusText}`);
    }

    const result = (await response.json()) as CreateReviewResult;

    console.error(`[Reagent] Review session created: ${result.sessionId} (${result.filesCount} file(s))`);

    // Handle browser opening
    const shouldOpenBrowser = requestedOpenBrowser ?? true;
    if (shouldOpenBrowser) {
      console.error(`[Reagent] Opening browser: ${result.reviewUrl}`);
      try {
        await open(result.reviewUrl);
      } catch (error) {
        console.error('[Reagent] Failed to open browser:', error);
        console.error('[Reagent] You can manually open the review at:', result.reviewUrl);
      }
    } else {
      console.error(`[Reagent] Browser opening disabled. Access review at: ${result.reviewUrl}`);
    }

    return result;
  } catch (error) {
    console.error('[Reagent] Failed to create review:', error);
    throw error;
  }
}
