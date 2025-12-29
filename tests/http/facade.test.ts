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
});
