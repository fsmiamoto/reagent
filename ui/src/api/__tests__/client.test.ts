import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../client";

function mockFetchOk(body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    }),
  );
}

function mockFetchError(
  status: number,
  statusText: string,
  body?: unknown,
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
      json:
        body !== undefined
          ? () => Promise.resolve(body)
          : () => Promise.reject(new Error("not json")),
    }),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("api.getSessions", () => {
  it("returns sessions on success", async () => {
    const sessions = [{ id: "1", title: "Review 1" }];
    mockFetchOk(sessions);

    const result = await api.getSessions();
    expect(result).toEqual(sessions);
  });

  it("extracts error message from JSON body", async () => {
    mockFetchError(500, "Internal Server Error", {
      error: "Database unavailable",
    });

    await expect(api.getSessions()).rejects.toThrow(
      "Failed to fetch sessions: Database unavailable",
    );
  });

  it("falls back to statusText when body is not JSON", async () => {
    mockFetchError(503, "Service Unavailable");

    await expect(api.getSessions()).rejects.toThrow(
      "Failed to fetch sessions: Service Unavailable",
    );
  });

  it("falls back to statusText when body has no error field", async () => {
    mockFetchError(400, "Bad Request", { message: "wrong field name" });

    await expect(api.getSessions()).rejects.toThrow(
      "Failed to fetch sessions: Bad Request",
    );
  });
});

describe("api.getSession", () => {
  it("returns demo session without fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await api.getSession("demo");
    expect(result.id).toBe("demo");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns session on success", async () => {
    const session = { id: "abc", status: "pending" };
    mockFetchOk(session);

    const result = await api.getSession("abc");
    expect(result).toEqual(session);
  });

  it("extracts error from 404 response", async () => {
    mockFetchError(404, "Not Found", {
      error: "Review session not found",
    });

    await expect(api.getSession("missing")).rejects.toThrow(
      "Failed to fetch session: Review session not found",
    );
  });
});

describe("api.addComment", () => {
  it("sends comment and returns result", async () => {
    const comment = { id: "c1", text: "fix this" };
    mockFetchOk(comment);

    const result = await api.addComment(
      "s1",
      "file.ts",
      10,
      10,
      "new",
      "fix this",
    );
    expect(result).toEqual(comment);
    expect(fetch).toHaveBeenCalledWith("/api/sessions/s1/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filePath: "file.ts",
        startLine: 10,
        endLine: 10,
        side: "new",
        text: "fix this",
      }),
    });
  });

  it("extracts error from 400 response", async () => {
    mockFetchError(400, "Bad Request", {
      error: "Review has already been completed",
    });

    await expect(
      api.addComment("s1", "file.ts", 1, 1, "new", "text"),
    ).rejects.toThrow(
      "Failed to add comment: Review has already been completed",
    );
  });
});

describe("api.deleteComment", () => {
  it("sends DELETE request", async () => {
    mockFetchOk({});

    await api.deleteComment("s1", "c1");
    expect(fetch).toHaveBeenCalledWith("/api/sessions/s1/comments/c1", {
      method: "DELETE",
    });
  });

  it("extracts error from response body", async () => {
    mockFetchError(404, "Not Found", { error: "Comment not found" });

    await expect(api.deleteComment("s1", "c1")).rejects.toThrow(
      "Failed to delete comment: Comment not found",
    );
  });
});

describe("api.completeReview", () => {
  it("sends completion request", async () => {
    mockFetchOk({});

    await api.completeReview("s1", "approved", "Looks good");
    expect(fetch).toHaveBeenCalledWith("/api/sessions/s1/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "approved",
        generalFeedback: "Looks good",
      }),
    });
  });

  it("extracts error from response body", async () => {
    mockFetchError(400, "Bad Request", {
      error: "Review has already been completed",
    });

    await expect(api.completeReview("s1", "approved", "")).rejects.toThrow(
      "Failed to complete review: Review has already been completed",
    );
  });
});

describe("api.cancelReview", () => {
  it("sends cancel request", async () => {
    mockFetchOk({});

    await api.cancelReview("s1");
    expect(fetch).toHaveBeenCalledWith("/api/sessions/s1/cancel", {
      method: "POST",
    });
  });

  it("extracts error from response body", async () => {
    mockFetchError(400, "Bad Request", {
      error: "Review has already been completed",
    });

    await expect(api.cancelReview("s1")).rejects.toThrow(
      "Failed to cancel review: Review has already been completed",
    );
  });

  it("falls back to statusText on non-JSON error", async () => {
    mockFetchError(500, "Internal Server Error");

    await expect(api.cancelReview("s1")).rejects.toThrow(
      "Failed to cancel review: Internal Server Error",
    );
  });
});
