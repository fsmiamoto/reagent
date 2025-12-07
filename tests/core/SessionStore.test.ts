import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionStore } from '@src/core/SessionStore.js';
import { ReviewSession } from '@src/core/ReviewSession.js';
import type { ReviewFile } from '@src/shared/types.js';

describe('SessionStore', () => {
    let store: SessionStore;
    const mockFiles: ReviewFile[] = [
        { path: 'test.ts', content: 'code', language: 'typescript' }
    ];

    beforeEach(() => {
        store = new SessionStore();
        vi.useFakeTimers();
    });

    const createSession = () => {
        const session = new ReviewSession(mockFiles);
        session.completionPromise.catch(() => { });
        return session;
    };

    afterEach(() => {
        store.clear();
        vi.restoreAllMocks();
    });

    it('should store and retrieve sessions', () => {
        const session = createSession();
        store.set(session);

        expect(store.has(session.id)).toBe(true);
        expect(store.get(session.id)).toBe(session);
    });

    it('should delete sessions', () => {
        const session = createSession();
        store.set(session);

        const deleted = store.delete(session.id);

        expect(deleted).toBe(true);
        expect(store.has(session.id)).toBe(false);
        expect(store.get(session.id)).toBeUndefined();
    });

    it('should return all sessions', () => {
        const session1 = createSession();
        const session2 = createSession();

        store.set(session1);
        store.set(session2);

        const allSessions = store.getAllSessions();
        expect(allSessions).toHaveLength(2);
        expect(allSessions).toContain(session1);
        expect(allSessions).toContain(session2);
    });

    it('should clear all sessions and cancel pending ones', () => {
        const session1 = createSession();
        const session2 = createSession();

        const cancelSpy1 = vi.spyOn(session1, 'cancel');
        const cancelSpy2 = vi.spyOn(session2, 'cancel');

        store.set(session1);
        store.set(session2);

        store.clear();

        expect(store.getAllSessions()).toHaveLength(0);
        expect(cancelSpy1).toHaveBeenCalledWith('Server shutting down');
        expect(cancelSpy2).toHaveBeenCalledWith('Server shutting down');
    });

    it('should cleanup old sessions', () => {
        const session1 = createSession();
        const session2 = createSession();
        const session3 = createSession();

        session2.complete('approved');
        session3.complete('approved');

        Object.defineProperty(session2, 'createdAt', {
            value: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
        });

        store.set(session1);
        store.set(session2);
        store.set(session3);

        const cleanedCount = store.cleanupOldSessions();

        expect(cleanedCount).toBe(1);
        expect(store.has(session1.id)).toBe(true);
        expect(store.has(session2.id)).toBe(false);
        expect(store.has(session3.id)).toBe(true);
    });
});
