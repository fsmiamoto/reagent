/**
 * Global test setup for Vitest
 *
 * This file runs before all tests and configures shared test behavior.
 */

import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
