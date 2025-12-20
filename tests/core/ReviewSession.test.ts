import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReviewSession } from '@src/models/reviewSession';
import type { ReviewFile } from '@src/models/domain';

describe('ReviewSession', () => {
    const mockFiles: ReviewFile[] = [
        { path: 'test.ts', content: 'code', language: 'typescript' }
    ];

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize correctly', () => {
        const session = new ReviewSession(mockFiles, 'Title', 'Description');

        expect(session.id).toBeDefined();
        expect(session.title).toBe('Title');
        expect(session.description).toBe('Description');
        expect(session.files).toEqual(mockFiles);
        expect(session.status).toBe('pending');
        expect(session.comments).toEqual([]);
    });

    it('should add single-line comments correctly', () => {
        const session = new ReviewSession(mockFiles);

        const comment = session.addComment('test.ts', 1, 1, 'new', 'Great code');

        expect(comment).toBeDefined();
        expect(comment.filePath).toBe('test.ts');
        expect(comment.startLine).toBe(1);
        expect(comment.endLine).toBe(1);
        expect(comment.text).toBe('Great code');
        expect(session.comments).toHaveLength(1);
        expect(session.comments[0]).toEqual(comment);
    });

    it('should add multi-line range comments correctly', () => {
        const session = new ReviewSession(mockFiles);

        const comment = session.addComment('test.ts', 5, 10, 'new', 'Review this block');

        expect(comment).toBeDefined();
        expect(comment.filePath).toBe('test.ts');
        expect(comment.startLine).toBe(5);
        expect(comment.endLine).toBe(10);
        expect(comment.text).toBe('Review this block');
        expect(session.comments).toHaveLength(1);
    });

    it('should complete successfully', async () => {
        const session = new ReviewSession(mockFiles);
        const promise = session.completionPromise;

        session.complete('approved', 'Looks good');

        expect(session.status).toBe('approved');
        expect(session.generalFeedback).toBe('Looks good');

        const result = await promise;
        expect(result.status).toBe('approved');
        expect(result.generalFeedback).toBe('Looks good');
    });

    it('should cancel successfully', async () => {
        const session = new ReviewSession(mockFiles);
        const promise = session.completionPromise;

        session.cancel('User cancelled');

        expect(session.status).toBe('cancelled');

        await expect(promise).rejects.toThrow('User cancelled');
    });

    it('should timeout automatically', async () => {
        const session = new ReviewSession(mockFiles, undefined, undefined, 1000);
        const promise = session.completionPromise;

        vi.advanceTimersByTime(1001);

        expect(session.status).toBe('cancelled');
        await expect(promise).rejects.toThrow('Review timed out');
    });

    it('should not allow completion after cancellation', async () => {
        const session = new ReviewSession(mockFiles);
        session.cancel();

        // Handle the rejection to prevent unhandled rejection error
        await expect(session.completionPromise).rejects.toThrow('Review cancelled');

        expect(() => {
            session.complete('approved');
        }).toThrow('Review has already been completed or cancelled');
    });

    it('should not allow cancellation after completion', async () => {
        const session = new ReviewSession(mockFiles);
        session.complete('approved');

        session.cancel();
        expect(session.status).toBe('approved');

        await expect(session.completionPromise).resolves.toEqual(expect.objectContaining({
            status: 'approved'
        }));
    });
});
