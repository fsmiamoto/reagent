import { describe, it, expect } from 'vitest';
import { resolveGitSource } from '@src/shared/types.js';

describe('resolveGitSource', () => {
  it('should return "uncommitted" when called with an empty object', () => {
    const result = resolveGitSource({});
    expect(result).toBe('uncommitted');
  });
});
