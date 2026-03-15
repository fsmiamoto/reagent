import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@src/http/facade", () => ({
  apiFacade: { get: vi.fn() },
}));

import { apiFacade } from "@src/http/facade";
import { getReview } from "@src/mcp/tools/getReview";
import type { ReviewSessionDetails } from "@src/models/domain";

const mockGet = apiFacade.get as Mock;

function makeSession(
  overrides: Partial<ReviewSessionDetails> = {},
): ReviewSessionDetails {
  return {
    id: "sess-123",
    status: "pending",
    files: [],
    comments: [],
    generalFeedback: "",
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("getReview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("returns pending status immediately when wait is false", async () => {
    mockGet.mockResolvedValue(makeSession({ status: "pending" }));

    const result = await getReview({ sessionId: "sess-123", wait: false });

    expect(result).toEqual({ status: "pending" });
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/sessions/sess-123");
  });

  it("returns approved review with feedback and comments", async () => {
    const comments = [
      {
        id: "c1",
        filePath: "src/app.ts",
        startLine: 10,
        endLine: 10,
        side: "new" as const,
        text: "Nice",
        createdAt: new Date(),
      },
    ];
    mockGet.mockResolvedValue(
      makeSession({
        status: "approved",
        generalFeedback: "Looks good!",
        comments,
      }),
    );

    const result = await getReview({ sessionId: "sess-123", wait: false });

    expect(result.status).toBe("approved");
    expect(result.generalFeedback).toBe("Looks good!");
    expect(result.comments).toEqual(comments);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it("returns changes_requested review with feedback", async () => {
    mockGet.mockResolvedValue(
      makeSession({
        status: "changes_requested",
        generalFeedback: "Needs work",
        comments: [],
      }),
    );

    const result = await getReview({ sessionId: "sess-123", wait: false });

    expect(result.status).toBe("changes_requested");
    expect(result.generalFeedback).toBe("Needs work");
    expect(result.comments).toEqual([]);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it("returns cancelled status without feedback fields", async () => {
    mockGet.mockResolvedValue(makeSession({ status: "cancelled" }));

    const result = await getReview({ sessionId: "sess-123", wait: false });

    expect(result).toEqual({ status: "cancelled" });
    expect(result.generalFeedback).toBeUndefined();
    expect(result.comments).toBeUndefined();
  });

  it("polls until review completes when wait is true", async () => {
    mockGet
      .mockResolvedValueOnce(makeSession({ status: "pending" }))
      .mockResolvedValueOnce(makeSession({ status: "pending" }))
      .mockResolvedValueOnce(
        makeSession({
          status: "approved",
          generalFeedback: "LGTM",
          comments: [],
        }),
      );

    const promise = getReview({ sessionId: "sess-123", wait: true });

    // Advance past the two 1-second waits
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result.status).toBe("approved");
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it("defaults wait to true", async () => {
    mockGet.mockResolvedValue(
      makeSession({ status: "approved", generalFeedback: "OK", comments: [] }),
    );

    const result = await getReview({ sessionId: "sess-123" });

    expect(result.status).toBe("approved");
    // Since first response is non-pending, it returns immediately
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("throws when API call fails", async () => {
    mockGet.mockRejectedValue(new Error("Not found"));

    await expect(
      getReview({ sessionId: "bad-id", wait: false }),
    ).rejects.toThrow("Not found");
  });

  it("throws original non-Error when API call fails with non-Error", async () => {
    mockGet.mockRejectedValue("raw-error");

    await expect(getReview({ sessionId: "bad-id", wait: false })).rejects.toBe(
      "raw-error",
    );
  });
});
