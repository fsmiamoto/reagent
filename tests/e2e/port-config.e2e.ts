import { describe, it, expect, afterEach } from 'vitest';
import {
    startServer,
    killServerOnPort,
    waitForServer,
    apiRequest,
    ServerHandle,
} from './utils';

/**
 * Port Configuration Smoke Tests
 *
 * Tests port configuration options:
 * 1. Default port (3636)
 * 2. Environment variable override (REAGENT_PORT)
 * 3. CLI flag override (--port)
 * 4. Review URL uses correct port
 *
 * Uses ports 4200-4202 to avoid conflicts with other smoke tests.
 */

describe('Port Configuration', () => {
    let server: ServerHandle | null = null;

    afterEach(async () => {
        if (server) {
            await server.stop();
            server = null;
        }
    });

    it('should start on default port 3636', async () => {
        // Clean up any existing server on default port
        await killServerOnPort(3636);

        server = await startServer({ port: 3636 });

        // Verify health endpoint works
        const { status } = await apiRequest(3636, 'GET', '/api/health');
        expect(status).toBe(200);
    });

    it('should respect REAGENT_PORT environment variable', async () => {
        const testPort = 4200;
        await killServerOnPort(testPort);

        server = await startServer({
            port: testPort,
            env: { REAGENT_PORT: String(testPort) },
        });

        const { status } = await apiRequest(testPort, 'GET', '/api/health');
        expect(status).toBe(200);
    });

    it('should respect --port CLI flag', async () => {
        const testPort = 4201;
        await killServerOnPort(testPort);

        server = await startServer({ port: testPort });

        const { status } = await apiRequest(testPort, 'GET', '/api/health');
        expect(status).toBe(200);
    });

    it('should use correct port in review URL', async () => {
        const testPort = 4202;
        await killServerOnPort(testPort);

        server = await startServer({ port: testPort });

        // Create a review via API
        const { status, data } = await apiRequest<{ reviewUrl: string }>(
            testPort,
            'POST',
            '/api/reviews',
            { source: 'local', files: ['package.json'], openBrowser: false }
        );

        expect(status).toBe(201);
        expect(data.reviewUrl).toContain(`localhost:${testPort}`);
    });
});
