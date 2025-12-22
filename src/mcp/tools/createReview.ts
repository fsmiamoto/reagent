import open from 'open';
import type { CreateReviewInput, CreateReviewResult } from '../../models/api';
import { apiFacade } from '../../http/facade';

export async function createReview(input: CreateReviewInput): Promise<CreateReviewResult> {
  const { openBrowser: requestedOpenBrowser, _host: _ignoredHost, ...requestPayload } = input;

  try {
    console.error(`[Reagent] Creating review via API`);

    const result = await apiFacade.post<CreateReviewResult>('/reviews', requestPayload);

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
      return result;
    }

    console.error(`[Reagent] Browser opening disabled. Access review at: ${result.reviewUrl}`);

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Reagent] Failed to create review:', message);
    throw error;
  }
}
