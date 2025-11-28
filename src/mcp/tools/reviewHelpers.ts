import { getReviewFilesFromGit } from '../../utils/git.js';
import { getLocalFiles } from '../../utils/files.js';
import type { ReviewInput, ReviewFile } from '../../shared/types.js';
import { resolveReviewSource } from '../../shared/types.js';

/**
 * Process input to extract review files
 * Shared by create_review and get_review tools
 */
export function extractReviewFiles(input: ReviewInput): {
  files: ReviewFile[];
  title?: string;
  description?: string;
} {
  const source = resolveReviewSource(input);
  const sourceLabel = input.source ? source : `${source} (auto-detected)`;
  console.error(`[Reagent] Using source: ${sourceLabel}`);

  const reviewInput = { ...input, source };
  let files: ReviewFile[];

  if (source === 'local') {
    if (!reviewInput.files || reviewInput.files.length === 0) {
      throw new Error('Files must be specified for local review');
    }
    files = getLocalFiles(reviewInput.files, reviewInput.workingDirectory);
  } else {
    files = getReviewFilesFromGit(reviewInput);
  }

  const title = reviewInput.title;
  const description = reviewInput.description;

  return { files, title, description };
}

/**
 * Get web server port from environment or default
 */
export function getReviewPort(): number {
  return Number(process.env.REAGENT_PORT) || 3636;
}

/**
 * Construct review URL for a session
 */
export function buildReviewUrl(sessionId: string, port?: number): string {
  const reviewPort = port ?? getReviewPort();
  return `http://localhost:${reviewPort}/review/${sessionId}`;
}
