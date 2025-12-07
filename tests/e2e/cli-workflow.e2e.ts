import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
    startServer,
    killServerOnPort,
    runCli,
    extractSessionId,
    ServerHandle,
} from './utils';

/**
 * CLI Workflow Smoke Tests
 *
 * Tests the basic CLI workflow:
 * 1. Start server with --detach
 * 2. Create a review with `review` command
 * 3. List sessions with `list` command
 * 4. Get session details with `get` command
 *
 * Uses port 4100 to avoid conflicts with other smoke tests.
 */

const TEST_PORT = 4100;

describe('CLI Workflow', () => {
    let server: ServerHandle;

    beforeAll(async () => {
        // Ensure no lingering server on our port
        await killServerOnPort(TEST_PORT);

        // Start server
        server = await startServer({ port: TEST_PORT });
    });

    afterAll(async () => {
        await server?.stop();
    });

    it('should create a review for a local file', () => {
        const output = runCli([
            'review',
            'package.json',
            '--no-open',
            '--source',
            'local',
            '--port',
            String(TEST_PORT),
        ]);

        expect(output).toContain('Review created');
        expect(output).toContain(`localhost:${TEST_PORT}`);

        const sessionId = extractSessionId(output);
        expect(sessionId).not.toBeNull();
    });

    it('should list sessions', () => {
        const output = runCli(['list', '--port', String(TEST_PORT)]);

        // Should contain at least the session we just created
        expect(output).toMatch(/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/i);
    });

    it('should get session details', () => {
        // First create a review to ensure we have a session
        const createOutput = runCli([
            'review',
            'package.json',
            '--no-open',
            '--source',
            'local',
            '--port',
            String(TEST_PORT),
        ]);

        const sessionId = extractSessionId(createOutput);
        expect(sessionId).not.toBeNull();

        // Now get the session details
        const getOutput = runCli(['get', sessionId!, '--json', '--port', String(TEST_PORT)]);

        // Should be valid JSON
        const parsed = JSON.parse(getOutput);
        expect(parsed).toHaveProperty('id', sessionId);
        expect(parsed).toHaveProperty('status');
    });
});
