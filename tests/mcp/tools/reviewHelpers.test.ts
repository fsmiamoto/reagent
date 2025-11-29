import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildReviewUrl, getReviewPort, setActualPort, resetActualPort } from '@src/mcp/tools/reviewHelpers.js';

describe('reviewHelpers', () => {
  const originalEnv = process.env.REAGENT_PORT;

  beforeEach(() => {
    // Reset the actual port for each test by setting a known value
    setActualPort(3637);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.REAGENT_PORT = originalEnv;
    } else {
      delete process.env.REAGENT_PORT;
    }
    vi.restoreAllMocks();
  });

  describe('getReviewPort', () => {
    it('should return actual port when set', () => {
      setActualPort(3637);
      expect(getReviewPort()).toBe(3637);
    });

    it('should throw error when actual port not set', () => {
      resetActualPort();
      expect(() => getReviewPort()).toThrow(
        'Actual server port not yet registered'
      );
    });

    it('should prefer actual port over env var', () => {
      process.env.REAGENT_PORT = '4000';
      setActualPort(3637);

      expect(getReviewPort()).toBe(3637);
    });
  });

  describe('buildReviewUrl', () => {
    it('should build URL with actual port', () => {
      setActualPort(3637);
      const url = buildReviewUrl('test-session-id');
      expect(url).toBe('http://localhost:3637/review/test-session-id');
    });

    it('should throw error when actual port not set for buildReviewUrl', () => {
      resetActualPort();
      expect(() => buildReviewUrl('test-session-id')).toThrow(
        'Actual server port not yet registered'
      );
    });

    it('should use explicit port parameter if provided', () => {
      setActualPort(3637);
      const url = buildReviewUrl('test-session-id', 5000);
      expect(url).toBe('http://localhost:5000/review/test-session-id');
    });

    it('should handle different session IDs correctly', () => {
      setActualPort(3636);

      const url1 = buildReviewUrl('abc-123');
      const url2 = buildReviewUrl('xyz-789');

      expect(url1).toBe('http://localhost:3636/review/abc-123');
      expect(url2).toBe('http://localhost:3636/review/xyz-789');
    });

    it('should construct valid URLs with special characters in session ID', () => {
      setActualPort(3636);

      const url = buildReviewUrl('session-with-dashes-123');
      expect(url).toBe('http://localhost:3636/review/session-with-dashes-123');
      expect(() => new URL(url)).not.toThrow();
    });
  });
});
