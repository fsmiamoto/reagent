import { getReviewFilesFromGit, getGitSummary } from '../../utils/git.js';
import type { GitReviewInput, ReviewFile } from '../../shared/types.js';
import { resolveGitSource } from '../../shared/types.js';

/**
 * Process git input to extract review files
 * Shared by create_review and get_review tools
 */
export function extractReviewFiles(input: GitReviewInput): {
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
