import { Router } from 'express';
import { AddCommentRequestSchema, CompleteReviewRequestSchema, ReviewInputSchema } from '../models/schemas';
import { reviewService } from '../review/service';
import { extractReviewFiles } from '../files/files';
import type { AddCommentRequest, CompleteReviewRequest, CreateReviewResult } from '../models/api';

export const apiRouter = Router();

/**
 * Build the review URL for a given session ID.
 */
export function buildReviewUrl(sessionId: string, host: string): string {
  return `http://${host}/review/${sessionId}`;
}

/**
 * GET /api/sessions
 * List all active review sessions
 */
apiRouter.get('/sessions', (_req, res) => {
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
apiRouter.post('/reviews', async (req, res) => {
  try {
    const input = ReviewInputSchema.parse(req.body);
    const host = req.get('host') || 'localhost:3636';

    const { files, title, description } = extractReviewFiles(input);
    const session = reviewService.createSession(files, title, description);

    const result: CreateReviewResult = {
      sessionId: session.id,
      reviewUrl: buildReviewUrl(session.id, host),
      filesCount: files.length,
      title,
    };

    res.status(201).json(result);
  } catch (error) {
    console.error('Failed to create review:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: 'Invalid request' });
  }
});

/**
 * GET /api/sessions/:id
 * Retrieve a review session by ID
 */
apiRouter.get('/sessions/:id', (req, res) => {
  const { id } = req.params;

  const session = reviewService.getSession(id);

  if (!session) {
    res.status(404).json({ error: 'Review session not found' });
    return;
  }

  res.json(session.toJSON());
});

/**
 * POST /api/sessions/:id/comments
 * Add a comment to a specific line in a file
 */
apiRouter.post('/sessions/:id/comments', (req, res) => {
  const { id } = req.params;

  const session = reviewService.getSession(id);

  if (!session) {
    res.status(404).json({ error: 'Review session not found' });
    return;
  }

  if (session.status !== 'pending') {
    res.status(400).json({ error: 'Review has already been completed' });
    return;
  }

  try {
    // Validate request body
    const commentData = AddCommentRequestSchema.parse(req.body) as AddCommentRequest;

    // Add the comment
    const comment = session.addComment(
      commentData.filePath,
      commentData.startLine,
      commentData.endLine,
      commentData.side,
      commentData.text
    );

    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: 'Invalid request' });
  }
});

/**
 * DELETE /api/sessions/:id/comments/:commentId
 * Delete a comment (for editing functionality)
 */
apiRouter.delete('/sessions/:id/comments/:commentId', (req, res) => {
  const { id, commentId } = req.params;

  const session = reviewService.getSession(id);

  if (!session) {
    res.status(404).json({ error: 'Review session not found' });
    return;
  }

  if (session.status !== 'pending') {
    res.status(400).json({ error: 'Review has already been completed' });
    return;
  }

  const commentIndex = session.comments.findIndex((c) => c.id === commentId);

  if (commentIndex === -1) {
    res.status(404).json({ error: 'Comment not found' });
    return;
  }

  // Remove the comment
  session.comments.splice(commentIndex, 1);

  res.status(204).send();
});

/**
 * POST /api/sessions/:id/complete
 * Complete the review with approval or change requests
 * This is the key endpoint that resolves the deferred promise!
 */
apiRouter.post('/sessions/:id/complete', (req, res) => {
  const { id } = req.params;

  const session = reviewService.getSession(id);

  if (!session) {
    res.status(404).json({ error: 'Review session not found' });
    return;
  }

  if (session.status !== 'pending') {
    res.status(400).json({ error: 'Review has already been completed' });
    return;
  }

  try {
    // Validate request body
    const completionData = CompleteReviewRequestSchema.parse(req.body) as CompleteReviewRequest;

    // Complete the review - this resolves the promise and unblocks the MCP tool!
    session.complete(completionData.status, completionData.generalFeedback);

    res.json({
      message: 'Review completed successfully',
      result: {
        status: completionData.status,
        generalFeedback: completionData.generalFeedback,
        comments: session.comments,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: 'Invalid request' });
  }
});

/**
 * POST /api/sessions/:id/cancel
 * Cancel the review
 */
apiRouter.post('/sessions/:id/cancel', (req, res) => {
  const { id } = req.params;

  const session = reviewService.getSession(id);

  if (!session) {
    res.status(404).json({ error: 'Review session not found' });
    return;
  }

  if (session.status !== 'pending') {
    res.status(400).json({ error: 'Review has already been completed' });
    return;
  }

  session.cancel('Review cancelled by user');

  res.json({ message: 'Review cancelled' });
});

/**
 * GET /api/health
 * Health check endpoint
 */
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeSessions: reviewService.listSessions().filter((s) => s.status === 'pending').length,
  });
});
