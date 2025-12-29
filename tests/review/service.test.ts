import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReviewService, IReviewService } from "@src/review/service";
import type { IReviewSessionStore } from "@src/review/store";
import type { ReviewFile } from "@src/models/domain";

describe("ReviewService", () => {
  let mockStore: IReviewSessionStore;
  let service: IReviewService;

  const mockFiles: ReviewFile[] = [
    { path: "test.ts", content: "const x = 1;", language: "typescript" },
  ];

  beforeEach(() => {
    mockStore = {
      set: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
      getAllSessions: vi.fn().mockReturnValue([]),
      clear: vi.fn(),
    };
    service = new ReviewService(mockStore);
  });

  describe("createSession", () => {
    it("creates a session and stores it", () => {
      const session = service.createSession(mockFiles, "Test Title");

      expect(session).toBeDefined();
      expect(session.files).toEqual(mockFiles);
      expect(session.title).toBe("Test Title");
      expect(mockStore.set).toHaveBeenCalledWith(session);
    });

    it("throws when no files provided", () => {
      expect(() => service.createSession([])).toThrow("No files to review");
      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it("creates session with description", () => {
      const session = service.createSession(mockFiles, "Title", "Description");

      expect(session.description).toBe("Description");
    });
  });

  describe("getSession", () => {
    it("delegates to store.get", () => {
      service.getSession("test-id");
      expect(mockStore.get).toHaveBeenCalledWith("test-id");
    });
  });

  describe("listSessions", () => {
    it("delegates to store.getAllSessions", () => {
      service.listSessions();
      expect(mockStore.getAllSessions).toHaveBeenCalled();
    });
  });
});
