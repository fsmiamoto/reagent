/**
 * Zod schemas for runtime validation
 */

import { z } from 'zod';
import { resolveReviewSource } from './types.js';

/**
 * Review input schema
 */
export const ReviewInputSchema = z
  .object({
    files: z.array(z.string().min(1)).optional(),
    source: z.enum(['uncommitted', 'commit', 'branch', 'local']).optional(),
    commitHash: z.string().optional(),
    base: z.string().optional(),
    head: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    workingDirectory: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const source = resolveReviewSource(data);

    if (source === 'commit' && !data.commitHash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commitHash'],
        message: 'commitHash is required when reviewing a commit',
      });
    }

    if (source === 'branch' && (!data.base || !data.head)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['base'],
        message: 'base and head are required when comparing branches',
      });
    }

    if (source === 'local' && (!data.files || data.files.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['files'],
        message: 'files are required for local review',
      });
    }
  });

export const CreateReviewInputSchema = z.intersection(
  ReviewInputSchema,
  z.object({
    openBrowser: z.boolean().optional().default(true),
  })
);

export const GetReviewInputSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  wait: z.boolean().optional().default(true),
});

export const AddCommentRequestSchema = z.object({
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  side: z.enum(['old', 'new']),
  text: z.string().min(1, 'Comment text is required'),
}).refine(
  data => data.endLine >= data.startLine,
  { message: 'endLine must be >= startLine', path: ['endLine'] }
);

export const CompleteReviewRequestSchema = z.object({
  status: z.enum(['approved', 'changes_requested']),
  generalFeedback: z.string().default(''),
});
