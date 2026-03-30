import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import type express from "express";
import { Server } from "@src/http/server";

vi.mock("@src/review/service", () => ({
  reviewService: {
    createSession: vi.fn(),
    getSession: vi.fn().mockReturnValue(null),
    listSessions: vi.fn().mockReturnValue([]),
  },
}));

vi.mock("@src/files/files", () => ({
  extractReviewFiles: vi.fn(),
}));

describe("buildExpressApp", () => {
  let app: express.Express;

  beforeEach(() => {
    const server = new Server();
    app = server.buildExpressApp();
  });

  it("mounts API routes under /api", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", activeSessions: 0 });
  });

  it("enables CORS", async () => {
    const res = await request(app)
      .options("/api/health")
      .set("Origin", "http://example.com")
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("parses JSON request bodies", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .send({ source: "uncommitted" })
      .set("Content-Type", "application/json");

    // Route handler validates and returns 400, not 500 from missing body parsing
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("falls through to SPA handler for non-API GET requests", async () => {
    // Non-API GET requests are served by the SPA handler which sends ui/dist/index.html
    const res = await request(app).get("/some/page");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("SPA handler serves index.html for any non-API path", async () => {
    const res = await request(app).get("/nonexistent-page");

    // SPA catch-all serves index.html for client-side routing
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});
