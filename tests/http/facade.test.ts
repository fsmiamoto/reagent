import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiFacade, createApiFacade } from "@src/http/facade";
import type { LockManager } from "@src/http/lock";

type MockResponse = {
  ok: boolean;
  status?: number;
  statusText?: string;
  json: () => Promise<unknown>;
};

describe("ApiFacade", () => {
  let originalFetch: typeof fetch;
  let fetchMock: ReturnType<typeof vi.fn>;
  let mockLock: LockManager;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    mockLock = {
      getServerPort: vi.fn(),
    } as unknown as LockManager;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("throws when server is not running", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(null);
    const facade = createApiFacade(mockLock);

    await expect(facade.get("/sessions")).rejects.toThrow(
      "server is not running",
    );
  });

  it("makes GET request with correct URL", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(3636);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: "1" }]),
    } as MockResponse);

    const facade = createApiFacade(mockLock);
    const result = await facade.get("/sessions");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3636/api/sessions",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toEqual([{ id: "1" }]);
  });

  it("makes POST request with body", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(4000);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessionId: "abc" }),
    } as MockResponse);

    const facade = createApiFacade(mockLock);
    const result = await facade.post("/reviews", { source: "uncommitted" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/reviews",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "uncommitted" }),
      }),
    );
    expect(result).toEqual({ sessionId: "abc" });
  });

  it("throws error for non-2xx responses", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(3636);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ error: "Session not found" }),
    } as MockResponse);

    const facade = createApiFacade(mockLock);

    await expect(facade.get("/sessions/invalid")).rejects.toThrow("API error");
  });

  it("returns true when server responds to health check", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(3636);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    } as MockResponse);

    const facade = new ApiFacade(mockLock);

    expect(await facade.isHealthy()).toBe(true);
  });

  it("returns false when no port available", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(null);

    const facade = new ApiFacade(mockLock);

    expect(await facade.isHealthy()).toBe(false);
  });

  it("makes DELETE request with correct URL", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(3636);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as MockResponse);

    const facade = createApiFacade(mockLock);
    const result = await facade.delete("/sessions/abc/comments/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3636/api/sessions/abc/comments/1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result).toEqual({ success: true });
  });

  it("returns false when fetch throws in isHealthy", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(3636);
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const facade = new ApiFacade(mockLock);

    expect(await facade.isHealthy()).toBe(false);
  });

  it("returns false when health check response is not ok", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(3636);
    fetchMock.mockResolvedValue({
      ok: false,
    } as MockResponse);

    const facade = new ApiFacade(mockLock);

    expect(await facade.isHealthy()).toBe(false);
  });

  it("falls back to statusText when error response JSON parsing fails", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(3636);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("invalid json")),
    } as MockResponse);

    const facade = createApiFacade(mockLock);

    await expect(facade.get("/sessions")).rejects.toThrow(
      "API error (500): Internal Server Error",
    );
  });

  it("uses error field from response body when available", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(3636);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: () => Promise.resolve({ error: "Invalid source type" }),
    } as MockResponse);

    const facade = createApiFacade(mockLock);

    await expect(facade.post("/reviews", {})).rejects.toThrow(
      "API error (422): Invalid source type",
    );
  });

  it("sends POST without Content-Type header when no body provided", async () => {
    vi.mocked(mockLock.getServerPort).mockReturnValue(3636);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ done: true }),
    } as MockResponse);

    const facade = createApiFacade(mockLock);
    await facade.post("/sessions/abc/complete");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3636/api/sessions/abc/complete",
      expect.objectContaining({
        method: "POST",
        headers: undefined,
        body: undefined,
      }),
    );
  });
});
