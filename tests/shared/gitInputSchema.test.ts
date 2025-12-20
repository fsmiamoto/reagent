import { describe, it, expect } from 'vitest';
import { resolveReviewSource } from '@src/models/api';

describe('resolveReviewSource', () => {
  it('should return "uncommitted" when called with an empty object', () => {
    const result = resolveReviewSource({});
    expect(result).toBe('uncommitted');
  });
});
