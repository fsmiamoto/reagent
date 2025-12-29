import { describe, it, expect } from 'vitest';
import { ReviewInputSchema } from '../../src/models/schemas';
import path from 'path';

describe('ReviewInputSchema', () => {
  describe('workingDirectory validation for local source', () => {
    it('should require workingDirectory for local source with relative paths', () => {
      const input = {
        source: 'local' as const,
        files: ['src/index.ts', 'README.md'],
      };

      const result = ReviewInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find(
          (issue) => issue.path[0] === 'workingDirectory'
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('workingDirectory');
        expect(error?.message).toContain('required');
      }
    });

    it('should succeed when workingDirectory is provided with relative paths', () => {
      const input = {
        source: 'local' as const,
        files: ['src/index.ts'],
        workingDirectory: '/Users/test/project',
      };

      const result = ReviewInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should succeed with absolute paths and no workingDirectory', () => {
      const absolutePath = path.join('/absolute/path', 'to', 'file.ts');
      const input = {
        source: 'local' as const,
        files: [absolutePath],
      };

      const result = ReviewInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should succeed with mix of absolute paths when all are absolute', () => {
      const input = {
        source: 'local' as const,
        files: ['/absolute/path/file1.ts', '/another/absolute/path/file2.ts'],
      };

      const result = ReviewInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should fail with mix of absolute and relative paths without workingDirectory', () => {
      const input = {
        source: 'local' as const,
        files: ['/absolute/path/file1.ts', 'relative/path/file2.ts'],
      };

      const result = ReviewInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find(
          (issue) => issue.path[0] === 'workingDirectory'
        );
        expect(error).toBeDefined();
      }
    });

    it('should succeed with mix of absolute and relative paths when workingDirectory is provided', () => {
      const input = {
        source: 'local' as const,
        files: ['/absolute/path/file1.ts', 'relative/path/file2.ts'],
        workingDirectory: '/Users/test/project',
      };

      const result = ReviewInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('file source validations', () => {
    it('should require files for local source', () => {
      const input = {
        source: 'local' as const,
      };

      const result = ReviewInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find(
          (issue) => issue.path[0] === 'files'
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('files are required');
      }
    });

    it('should require commitHash for commit source', () => {
      const input = {
        source: 'commit' as const,
      };

      const result = ReviewInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find(
          (issue) => issue.path[0] === 'commitHash'
        );
        expect(error).toBeDefined();
      }
    });

    it('should require base and head for branch source', () => {
      const input = {
        source: 'branch' as const,
      };

      const result = ReviewInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find(
          (issue) => issue.path[0] === 'base'
        );
        expect(error).toBeDefined();
      }
    });
  });
});
