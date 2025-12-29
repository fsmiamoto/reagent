import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InMemoryReviewSessionStore } from "@src/review/store";
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
});
