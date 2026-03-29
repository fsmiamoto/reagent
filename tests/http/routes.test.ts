import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { ReviewSession } from "@src/review/session";
import type { ReviewFile } from "@src/models/domain";

vi.mock("@src/review/service", () => {
  return {
    reviewService: {
      createSession: vi.fn(),
      getSession: vi.fn(),
      listSessions: vi.fn(),
    },
  };
});

vi.mock("@src/files/files", () => {
  return {
    extractReviewFiles: vi.fn(),
  };
});

import { apiRouter, buildReviewUrl } from "@src/http/routes";
import { reviewService } from "@src/review/service";
import { extractReviewFiles } from "@src/files/files";

const mockedService = vi.mocked(reviewService);
const mockedExtractReviewFiles = vi.mocked(extractReviewFiles);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", apiRouter);
  return app;
}

const sampleFiles: ReviewFile[] = [
  {
    path: "src/index.ts",
    content: "console.log('hello');",
    language: "typescript",
  },
];

function createPendingSession(
  files: ReviewFile[] = sampleFiles,
  title?: string,
  description?: string,
): ReviewSession {
  return new ReviewSession(files, title, description);
}

describe("routes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildReviewUrl", () => {
    it("builds the correct URL", () => {
      expect(buildReviewUrl("abc-123", "localhost:3636")).toBe(
        "http://localhost:3636/review/abc-123",
      );
    });
  });

  describe("GET /api/sessions", () => {
    it("returns an empty list when no sessions exist", async () => {
      mockedService.listSessions.mockReturnValue([]);

      const res = await request(app).get("/api/sessions");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns session summaries", async () => {
      const session = createPendingSession(
        sampleFiles,
        "My Review",
        "A description",
      );
      mockedService.listSessions.mockReturnValue([session]);

      const res = await request(app).get("/api/sessions");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: session.id,
        status: "pending",
        filesCount: 1,
        title: "My Review",
        description: "A description",
      });
    });
  });

  describe("POST /api/reviews", () => {
    it("creates a review session and returns 201", async () => {
      const session = createPendingSession(sampleFiles, "Test Review");

      mockedExtractReviewFiles.mockReturnValue({
        files: sampleFiles,
        title: "Test Review",
        description: undefined,
      });
      mockedService.createSession.mockReturnValue(session);

      const res = await request(app)
        .post("/api/reviews")
        .send({ source: "local", files: ["/tmp/test.ts"] });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        sessionId: session.id,
        filesCount: 1,
        title: "Test Review",
      });
      expect(res.body.reviewUrl).toContain(`/review/${session.id}`);
    });

    it("uses provided Host header in reviewUrl when no configuredHost", async () => {
      const session = createPendingSession(sampleFiles, "Test Review");
      mockedExtractReviewFiles.mockReturnValue({
        files: sampleFiles,
        title: "Test Review",
        description: undefined,
      });
      mockedService.createSession.mockReturnValue(session);

      const res = await request(app)
        .post("/api/reviews")
        .set("Host", "myhost:8080")
        .send({ source: "local", files: ["/tmp/test.ts"] });

      expect(res.status).toBe(201);
      expect(res.body.reviewUrl).toBe(
        `http://myhost:8080/review/${session.id}`,
      );
    });

    it("uses configuredHost from app.locals when set", async () => {
      const session = createPendingSession(sampleFiles, "Test Review");
      mockedExtractReviewFiles.mockReturnValue({
        files: sampleFiles,
        title: "Test Review",
        description: undefined,
      });
      mockedService.createSession.mockReturnValue(session);

      const configuredApp = createApp();
      configuredApp.locals.configuredHost = "tokyo";

      const res = await request(configuredApp)
        .post("/api/reviews")
        .set("Host", "ignored:9999")
        .send({ source: "local", files: ["/tmp/test.ts"] });

      expect(res.status).toBe(201);
      // configuredHost takes precedence over Host header; port comes from socket
      expect(res.body.reviewUrl).toMatch(
        new RegExp(`^http://tokyo:\\d+/review/${session.id}$`),
      );
    });

    it("uses actual server port in reviewUrl when Host header is absent", async () => {
      const session = createPendingSession(sampleFiles, "Test Review");
      mockedExtractReviewFiles.mockReturnValue({
        files: sampleFiles,
        title: "Test Review",
        description: undefined,
      });
      mockedService.createSession.mockReturnValue(session);

      // Create a separate app that strips the Host header before the router
      const noHostApp = express();
      noHostApp.use(express.json());
      noHostApp.use((_req, _res, next) => {
        delete _req.headers.host;
        next();
      });
      noHostApp.use("/api", apiRouter);

      const res = await request(noHostApp)
        .post("/api/reviews")
        .send({ source: "local", files: ["/tmp/test.ts"] });

      expect(res.status).toBe(201);
      // Without Host header, falls back to req.socket.localPort (the actual port)
      // The URL should contain the actual listening port, not hardcoded 3636
      expect(res.body.reviewUrl).toMatch(
        new RegExp(`^http://localhost:\\d+/review/${session.id}$`),
      );
    });

    it("returns 400 on invalid input", async () => {
      mockedExtractReviewFiles.mockImplementation(() => {
        throw new Error("Files must be specified for local review");
      });

      const res = await request(app)
        .post("/api/reviews")
        .send({ source: "local" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 with generic message for non-Error throws", async () => {
      mockedExtractReviewFiles.mockImplementation(() => {
        throw "something unexpected";
      });

      const res = await request(app)
        .post("/api/reviews")
        .send({ source: "uncommitted" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid request");
    });
  });

  describe("GET /api/sessions/:id", () => {
    it("returns session details", async () => {
      const session = createPendingSession(sampleFiles, "My Review");
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app).get(`/api/sessions/${session.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: session.id,
        status: "pending",
        title: "My Review",
      });
      expect(res.body.files).toHaveLength(1);
    });

    it("returns 404 when session not found", async () => {
      mockedService.getSession.mockReturnValue(undefined);

      const res = await request(app).get("/api/sessions/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Review session not found");
    });
  });

  describe("POST /api/sessions/:id/comments", () => {
    it("adds a comment to a pending session", async () => {
      const session = createPendingSession();
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app)
        .post(`/api/sessions/${session.id}/comments`)
        .send({
          filePath: "src/index.ts",
          startLine: 1,
          endLine: 1,
          side: "new",
          text: "Looks good!",
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        filePath: "src/index.ts",
        startLine: 1,
        endLine: 1,
        side: "new",
        text: "Looks good!",
      });
      expect(res.body.id).toBeDefined();
      expect(session.comments).toHaveLength(1);
    });

    it("returns 404 when session not found", async () => {
      mockedService.getSession.mockReturnValue(undefined);

      const res = await request(app)
        .post("/api/sessions/nonexistent/comments")
        .send({
          filePath: "src/index.ts",
          startLine: 1,
          endLine: 1,
          side: "new",
          text: "Hello",
        });

      expect(res.status).toBe(404);
    });

    it("returns 400 when session is already completed", async () => {
      const session = createPendingSession();
      session.complete("approved");
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app)
        .post(`/api/sessions/${session.id}/comments`)
        .send({
          filePath: "src/index.ts",
          startLine: 1,
          endLine: 1,
          side: "new",
          text: "Hello",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Review has already been completed");
    });

    it("returns 400 on invalid comment data", async () => {
      const session = createPendingSession();
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app)
        .post(`/api/sessions/${session.id}/comments`)
        .send({
          filePath: "",
          startLine: -1,
          endLine: 1,
          side: "invalid",
          text: "",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 with generic message for non-Error throws", async () => {
      const session = createPendingSession();
      mockedService.getSession.mockReturnValue(session);

      // Mock addComment to throw a non-Error
      vi.spyOn(session, "addComment").mockImplementation(() => {
        throw "unexpected";
      });

      const res = await request(app)
        .post(`/api/sessions/${session.id}/comments`)
        .send({
          filePath: "src/index.ts",
          startLine: 1,
          endLine: 1,
          side: "new",
          text: "test",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid request");
    });
  });

  describe("DELETE /api/sessions/:id/comments/:commentId", () => {
    it("deletes a comment from a pending session", async () => {
      const session = createPendingSession();
      const comment = session.addComment("src/index.ts", 1, 1, "new", "Test");
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app).delete(
        `/api/sessions/${session.id}/comments/${comment.id}`,
      );

      expect(res.status).toBe(204);
      expect(session.comments).toHaveLength(0);
    });

    it("returns 404 when session not found", async () => {
      mockedService.getSession.mockReturnValue(undefined);

      const res = await request(app).delete(
        "/api/sessions/nonexistent/comments/abc",
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Review session not found");
    });

    it("returns 400 when session is already completed", async () => {
      const session = createPendingSession();
      const comment = session.addComment("src/index.ts", 1, 1, "new", "Test");
      session.complete("approved");
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app).delete(
        `/api/sessions/${session.id}/comments/${comment.id}`,
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Review has already been completed");
    });

    it("returns 404 when comment not found", async () => {
      const session = createPendingSession();
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app).delete(
        `/api/sessions/${session.id}/comments/nonexistent`,
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Comment not found");
    });
  });

  describe("POST /api/sessions/:id/complete", () => {
    it("completes a review with approved status", async () => {
      const session = createPendingSession();
      session.addComment("src/index.ts", 1, 1, "new", "LGTM");
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app)
        .post(`/api/sessions/${session.id}/complete`)
        .send({
          status: "approved",
          generalFeedback: "Great work!",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Review completed successfully");
      expect(res.body.result.status).toBe("approved");
      expect(res.body.result.generalFeedback).toBe("Great work!");
      expect(res.body.result.comments).toHaveLength(1);
      expect(session.status).toBe("approved");
    });

    it("completes a review with changes_requested status", async () => {
      const session = createPendingSession();
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app)
        .post(`/api/sessions/${session.id}/complete`)
        .send({
          status: "changes_requested",
          generalFeedback: "Please fix the bug",
        });

      expect(res.status).toBe(200);
      expect(res.body.result.status).toBe("changes_requested");
      expect(session.status).toBe("changes_requested");
    });

    it("returns 404 when session not found", async () => {
      mockedService.getSession.mockReturnValue(undefined);

      const res = await request(app)
        .post("/api/sessions/nonexistent/complete")
        .send({ status: "approved" });

      expect(res.status).toBe(404);
    });

    it("returns 400 when session is already completed", async () => {
      const session = createPendingSession();
      session.complete("approved");
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app)
        .post(`/api/sessions/${session.id}/complete`)
        .send({ status: "approved" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Review has already been completed");
    });

    it("returns 400 on invalid completion data", async () => {
      const session = createPendingSession();
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app)
        .post(`/api/sessions/${session.id}/complete`)
        .send({ status: "invalid_status" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 with generic message for non-Error throws", async () => {
      const session = createPendingSession();
      mockedService.getSession.mockReturnValue(session);

      vi.spyOn(session, "complete").mockImplementation(() => {
        throw "unexpected";
      });

      const res = await request(app)
        .post(`/api/sessions/${session.id}/complete`)
        .send({ status: "approved" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid request");
    });
  });

  describe("POST /api/sessions/:id/cancel", () => {
    it("cancels a pending review", async () => {
      const session = createPendingSession();
      // Catch the rejection from completionPromise to prevent unhandled rejection
      session.completionPromise.catch(() => {});
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app).post(`/api/sessions/${session.id}/cancel`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Review cancelled");
      expect(session.status).toBe("cancelled");
    });

    it("returns 404 when session not found", async () => {
      mockedService.getSession.mockReturnValue(undefined);

      const res = await request(app).post("/api/sessions/nonexistent/cancel");

      expect(res.status).toBe(404);
    });

    it("returns 400 when session is already completed", async () => {
      const session = createPendingSession();
      session.complete("approved");
      mockedService.getSession.mockReturnValue(session);

      const res = await request(app).post(`/api/sessions/${session.id}/cancel`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Review has already been completed");
    });
  });

  describe("GET /api/health", () => {
    it("returns health status with active session count", async () => {
      const pendingSession = createPendingSession();
      const completedSession = createPendingSession();
      completedSession.complete("approved");

      mockedService.listSessions.mockReturnValue([
        pendingSession,
        completedSession,
      ]);

      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: "ok",
        activeSessions: 1,
      });
    });

    it("returns zero active sessions when none exist", async () => {
      mockedService.listSessions.mockReturnValue([]);

      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.activeSessions).toBe(0);
    });
  });
});
