import { ReviewSession } from './ReviewSession.js';
import { sessionStore } from './SessionStore.js';
import type { CreateReviewInput, CreateReviewResult, ReviewFile } from '../shared/types.js';
import { resolveReviewSource } from '../shared/types.js';
import { getReviewFilesFromGit } from '../utils/git.js';
import { getLocalFiles } from '../utils/files.js';

/**
 * Build review URL from session ID and host
 */
export function buildReviewUrl(sessionId: string, host: string): string {
    return `http://${host}/review/${sessionId}`;
}

/**
 * Extract review files from input based on source type
 */
export function extractReviewFiles(input: CreateReviewInput): {
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
 * Core service for creating review sessions.
 */
export function createReviewSession(
    input: CreateReviewInput,
    host: string
): CreateReviewResult {
    const { files, title, description } = extractReviewFiles(input);

    console.error(`[Reagent] Creating review session for ${files.length} file(s)`);

    if (files.length === 0) {
        throw new Error('No files to review. Check your source and file filters.');
    }

    const session = new ReviewSession(files, title, description);

    sessionStore.set(session);

    const reviewUrl = buildReviewUrl(session.id, host);

    const result: CreateReviewResult = {
        sessionId: session.id,
        reviewUrl,
        filesCount: files.length,
        title,
    };

    console.error(`[Reagent] Review session created: ${session.id}`);

    return result;
}
