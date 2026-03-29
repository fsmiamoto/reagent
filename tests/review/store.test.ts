import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InMemoryReviewSessionStore, SESSION_TTL_MS } from "@src/review/store";
import { ReviewSession } from "@src/review/session";
import type { ReviewFile } from "@src/models/domain";

describe("ReviewSessionStore", () => {
  let store: InMemoryReviewSessionStore;
  const mockFiles: ReviewFile[] = [
    { path: "test.ts", content: "code", language: "typescript" },
  ];

  beforeEach(() => {
    store = new InMemoryReviewSessionStore();
    vi.useFakeTimers();
  });

  const createSession = () => {
    const session = new ReviewSession(mockFiles);
    session.completionPromise.catch(() => {});
    return session;
  };

  afterEach(() => {
    store.clear();
    vi.restoreAllMocks();
  });

  it("should store and retrieve sessions", () => {
    const session = createSession();
    store.set(session);

    expect(store.has(session.id)).toBe(true);
    expect(store.get(session.id)).toBe(session);
  });

  it("should delete sessions", () => {
    const session = createSession();
    store.set(session);

    const deleted = store.delete(session.id);

    expect(deleted).toBe(true);
    expect(store.has(session.id)).toBe(false);
    expect(store.get(session.id)).toBeUndefined();
  });

  it("should return all sessions", () => {
    const session1 = createSession();
    const session2 = createSession();

    store.set(session1);
    store.set(session2);

    const allSessions = store.getAllSessions();
    expect(allSessions).toHaveLength(2);
    expect(allSessions).toContain(session1);
    expect(allSessions).toContain(session2);
  });

  it("should clear all sessions and cancel pending ones", () => {
    const session1 = createSession();
    const session2 = createSession();

    const cancelSpy1 = vi.spyOn(session1, "cancel");
    const cancelSpy2 = vi.spyOn(session2, "cancel");

    store.set(session1);
    store.set(session2);

    store.clear();

    expect(store.getAllSessions()).toHaveLength(0);
    expect(cancelSpy1).toHaveBeenCalledWith("Server shutting down");
    expect(cancelSpy2).toHaveBeenCalledWith("Server shutting down");
  });

  describe("session expiration", () => {
    it("should remove completed sessions older than TTL on set()", () => {
      const old = createSession();
      store.set(old);
      old.complete("approved");

      // Advance past TTL
      vi.advanceTimersByTime(SESSION_TTL_MS + 1);

      // Adding a new session triggers sweep
      const fresh = createSession();
      store.set(fresh);

      expect(store.has(old.id)).toBe(false);
      expect(store.has(fresh.id)).toBe(true);
    });

    it("should remove cancelled sessions older than TTL on set()", () => {
      const old = createSession();
      store.set(old);
      old.cancel("done");

      vi.advanceTimersByTime(SESSION_TTL_MS + 1);

      const fresh = createSession();
      store.set(fresh);

      expect(store.has(old.id)).toBe(false);
      expect(store.has(fresh.id)).toBe(true);
    });

    it("should NOT remove pending sessions regardless of age", () => {
      const pending = createSession();
      store.set(pending);

      vi.advanceTimersByTime(SESSION_TTL_MS * 10);

      const fresh = createSession();
      store.set(fresh);

      expect(store.has(pending.id)).toBe(true);
      expect(pending.status).toBe("pending");
    });

    it("should NOT remove completed sessions within TTL", () => {
      const recent = createSession();
      store.set(recent);
      recent.complete("changes_requested");

      vi.advanceTimersByTime(SESSION_TTL_MS - 1000);

      const fresh = createSession();
      store.set(fresh);

      expect(store.has(recent.id)).toBe(true);
    });

    it("should sweep expired sessions on getAllSessions()", () => {
      const old = createSession();
      store.set(old);
      old.complete("approved");

      vi.advanceTimersByTime(SESSION_TTL_MS + 1);

      const sessions = store.getAllSessions();
      expect(sessions).toHaveLength(0);
      expect(store.has(old.id)).toBe(false);
    });

    it("should keep mix of pending and expired sessions correctly", () => {
      const expired1 = createSession();
      const expired2 = createSession();
      const pending = createSession();
      store.set(expired1);
      store.set(expired2);
      store.set(pending);

      expired1.complete("approved");
      expired2.cancel("stale");

      vi.advanceTimersByTime(SESSION_TTL_MS + 1);

      const sessions = store.getAllSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(pending.id);
      expect(pending.status).toBe("pending");
    });
  });
});
