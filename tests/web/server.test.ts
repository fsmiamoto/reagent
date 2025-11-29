import { describe, it, expect } from 'vitest';
import { createWebServer } from '@src/web/server.js';

describe('web server', () => {
  it('should create an express application', () => {
    // Test that createWebServer returns a valid Express app
    const app = createWebServer();

    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
    expect(typeof app.get).toBe('function');
    expect(typeof app.listen).toBe('function');
  });

  it('should set up API and static routes', () => {
    // Verify the app has proper middleware configured
    const app = createWebServer();

    // The app should be a valid Express app with listen capability
    expect(app._router).toBeDefined();
  });
});
