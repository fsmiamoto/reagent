import { describe, it, expect } from 'vitest';
import { createWebServer } from '@src/http/server';

describe('web server', () => {
  it('should create an express application', () => {
    const app = createWebServer();

    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
    expect(typeof app.get).toBe('function');
    expect(typeof app.listen).toBe('function');
  });

  it('should set up API and static routes', () => {
    const app = createWebServer();

    expect(app._router).toBeDefined();
  });
});
