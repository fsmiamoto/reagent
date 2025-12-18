import { getReviewFilesFromGit } from '../../utils/git';
import { getLocalFiles } from '../../utils/files';
import type { ReviewInput, ReviewFile } from '../../shared/types';
import { resolveReviewSource } from '../../shared/types';

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

export function buildReviewUrl(sessionId: string, host: string): string {
  return `http://${host}/review/${sessionId}`;
}
