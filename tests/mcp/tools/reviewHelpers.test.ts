import { describe, it, expect } from 'vitest';
import { buildReviewUrl } from '@src/http/routes';

describe('reviewHelpers', () => {
  describe('buildReviewUrl', () => {
    it('builds URL with the provided host', () => {
      const url = buildReviewUrl('test-session-id', 'localhost:3636');
      expect(url).toBe('http://localhost:3636/review/test-session-id');
    });

    it('works with different ports', () => {
      const url = buildReviewUrl('test-session-id', 'localhost:5000');
      expect(url).toBe('http://localhost:5000/review/test-session-id');
    });

    it('handles different session IDs consistently', () => {
      const url1 = buildReviewUrl('abc-123', 'localhost:3636');
      const url2 = buildReviewUrl('xyz-789', 'localhost:3636');

      expect(url1).toBe('http://localhost:3636/review/abc-123');
      expect(url2).toBe('http://localhost:3636/review/xyz-789');
    });

    it('works with custom hosts', () => {
      const url = buildReviewUrl('session', '192.168.1.100:8080');
      expect(url).toBe('http://192.168.1.100:8080/review/session');
    });
  });
});
