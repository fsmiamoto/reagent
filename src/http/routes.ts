import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import {
  AddCommentRequestSchema,
  CompleteReviewRequestSchema,
  ReviewInputSchema,
} from "../models/schemas";
import { reviewService } from "../review/service";
import { extractReviewFiles } from "../files/files";
import type { CreateReviewResult } from "../models/api";
import type { ReviewSession } from "../review/session";

export const apiRouter = Router();

/**
 * Build the review URL for a given session ID.
 */
export function buildReviewUrl(sessionId: string, host: string): string {
  return `http://${host}/review/${sessionId}`;
}

/**
 * Middleware: load session by :id param and attach to res.locals.session.
 * Returns 404 if session not found.
 */
export function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { id } = req.params;
  const session = reviewService.getSession(id);
  if (!session) {
    res.status(404).json({ error: "Review session not found" });
    return;
  }
  res.locals.session = session;
  next();
}

/**
 * Middleware: require session status to be "pending".
 * Must be chained after requireSession.
 * Returns 400 if review is already completed.
 */
export function requirePendingSession(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const session: ReviewSession = res.locals.session;
  if (session.status !== "pending") {
    res.status(400).json({ error: "Review has already been completed" });
    return;
  }
  next();
}

/** Extract the session set by requireSession middleware. */
function getSession(res: Response): ReviewSession {
  return res.locals.session;
}

/**
 * GET /api/sessions
 * List all active review sessions
 */
apiRouter.get("/sessions", (_req, res) => {
  const sessions = reviewService.listSessions().map((session) => ({
    id: session.id,
    status: session.status,
    filesCount: session.files.length,
    title: session.title,
    description: session.description,
    createdAt: session.createdAt,
  }));

  res.json(sessions);
});

/**
 * POST /api/reviews
 * Create a new review session
 */
apiRouter.post("/reviews", async (req, res) => {
  try {
    const input = ReviewInputSchema.parse(req.body);
    const host = req.get("host") || "localhost:3636";

    const { files, title, description } = extractReviewFiles(input);
    const session = reviewService.createSession(files, title, description);

    const result: CreateReviewResult = {
      sessionId: session.id,
      reviewUrl: buildReviewUrl(session.id, host),
      filesCount: files.length,
      title,
    };

    res.status(201).json(result);
  } catch (error: unknown) {
    console.error("Failed to create review:", error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: "Invalid request" });
  }
});

/**
 * GET /api/sessions/:id
 * Retrieve a review session by ID
 */
apiRouter.get("/sessions/:id", requireSession, (_req, res) => {
  res.json(getSession(res).toJSON());
});

/**
 * POST /api/sessions/:id/comments
 * Add a comment to a specific line in a file
 */
apiRouter.post(
  "/sessions/:id/comments",
  requireSession,
  requirePendingSession,
  (req, res) => {
    try {
      const commentData = AddCommentRequestSchema.parse(req.body);
      const session = getSession(res);

      const comment = session.addComment(
        commentData.filePath,
        commentData.startLine,
        commentData.endLine,
        commentData.side,
        commentData.text,
      );

      res.status(201).json(comment);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: "Invalid request" });
    }
  },
);

/**
 * DELETE /api/sessions/:id/comments/:commentId
 * Delete a comment (for editing functionality)
 */
apiRouter.delete(
  "/sessions/:id/comments/:commentId",
  requireSession,
  requirePendingSession,
  (req, res) => {
    const session = getSession(res);
    const commentIndex = session.comments.findIndex(
      (c) => c.id === req.params.commentId,
    );

    if (commentIndex === -1) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    session.comments.splice(commentIndex, 1);

    res.status(204).send();
  },
);

/**
 * POST /api/sessions/:id/complete
 * Complete the review with approval or change requests
 * This is the key endpoint that resolves the deferred promise!
 */
apiRouter.post(
  "/sessions/:id/complete",
  requireSession,
  requirePendingSession,
  (req, res) => {
    try {
      const completionData = CompleteReviewRequestSchema.parse(req.body);
      const session = getSession(res);

      session.complete(completionData.status, completionData.generalFeedback);

      res.json({
        message: "Review completed successfully",
        result: {
          status: completionData.status,
          generalFeedback: completionData.generalFeedback,
          comments: session.comments,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: "Invalid request" });
    }
  },
);

/**
 * POST /api/sessions/:id/cancel
 * Cancel the review
 */
apiRouter.post(
  "/sessions/:id/cancel",
  requireSession,
  requirePendingSession,
  (_req, res) => {
    getSession(res).cancel("Review cancelled by user");

    res.json({ message: "Review cancelled" });
  },
);

/**
 * GET /api/health
 * Health check endpoint
 */
apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    activeSessions: reviewService
      .listSessions()
      .filter((s) => s.status === "pending").length,
  });
});
