/**
 * Zod schemas for runtime validation
 */

import { z } from 'zod';
import { resolveGitSource } from './types.js';

/**
 * Git-based review input schema
 */
export const GitReviewInputSchema = z
  .object({
    files: z.array(z.string().min(1)).optional(),
    source: z.enum(['uncommitted', 'commit', 'branch']).optional(),
    commitHash: z.string().optional(),
    base: z.string().optional(),
    head: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    workingDirectory: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const resolvedSource = resolveGitSource(data);

    if (resolvedSource === 'commit' && !data.commitHash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commitHash'],
        message: 'commitHash is required when reviewing a commit',
      });
    }

    if (resolvedSource === 'branch' && (!data.base || !data.head)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['base'],
        message: 'base and head are required when comparing branches',
      });
    }
  });

export const AskForReviewInputSchema = GitReviewInputSchema;

export const AddCommentRequestSchema = z.object({
  filePath: z.string().min(1),
  lineNumber: z.number().int().positive(),
  text: z.string().min(1, 'Comment text is required'),
});

export const CompleteReviewRequestSchema = z.object({
  status: z.enum(['approved', 'changes_requested']),
  generalFeedback: z.string().default(''),
});
