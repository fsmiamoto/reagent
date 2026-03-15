import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("open", () => ({ default: vi.fn() }));
vi.mock("@src/http/facade", () => ({
  apiFacade: { post: vi.fn() },
}));

import open from "open";
import { apiFacade } from "@src/http/facade";
import { createReview } from "@src/mcp/tools/createReview";
import type { CreateReviewResult } from "@src/models/api";

const mockPost = apiFacade.post as Mock;
const mockOpen = open as unknown as Mock;

const fakeResult: CreateReviewResult = {
  sessionId: "sess-123",
  reviewUrl: "http://localhost:3636/review/sess-123",
  filesCount: 2,
  title: "Test review",
};

describe("createReview", () => {
  beforeEach(() => {
    mockPost.mockResolvedValue(fakeResult);
    mockOpen.mockResolvedValue(undefined);
  });

  it("posts to /reviews with the review payload", async () => {
    await createReview({ source: "uncommitted", title: "My review" });

    expect(mockPost).toHaveBeenCalledWith("/reviews", {
      source: "uncommitted",
      title: "My review",
    });
  });

  it("strips openBrowser and _host from the payload", async () => {
    await createReview({
      source: "commit",
      commitHash: "abc123",
      openBrowser: false,
      _host: "localhost:5000",
    });

    expect(mockPost).toHaveBeenCalledWith("/reviews", {
      source: "commit",
      commitHash: "abc123",
    });
  });

  it("returns the API result", async () => {
    const result = await createReview({});

    expect(result).toEqual(fakeResult);
  });

  it("opens browser by default", async () => {
    await createReview({});

    expect(mockOpen).toHaveBeenCalledWith(fakeResult.reviewUrl);
  });

  it("opens browser when openBrowser is true", async () => {
    await createReview({ openBrowser: true });

    expect(mockOpen).toHaveBeenCalledWith(fakeResult.reviewUrl);
  });

  it("skips browser when openBrowser is false", async () => {
    await createReview({ openBrowser: false });

    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("does not throw when browser open fails", async () => {
    mockOpen.mockRejectedValue(new Error("No display"));

    const result = await createReview({});

    expect(result).toEqual(fakeResult);
  });

  it("throws when API call fails", async () => {
    mockPost.mockRejectedValue(new Error("Server unreachable"));

    await expect(createReview({})).rejects.toThrow("Server unreachable");
  });

  it("throws original non-Error when API call fails with non-Error", async () => {
    mockPost.mockRejectedValue("string-error");

    await expect(createReview({})).rejects.toBe("string-error");
  });

  it("sends empty payload when no options provided", async () => {
    await createReview({});

    expect(mockPost).toHaveBeenCalledWith("/reviews", {});
  });
});
