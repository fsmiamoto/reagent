import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
    startServer,
    killServerOnPort,
    apiRequest,
    extractSessionId,
    ServerHandle,
} from './utils';

/**
 * API Smoke Tests
 *
 * Tests the HTTP API endpoints directly:
 * - GET /api/health
 * - POST /api/reviews
 * - GET /api/reviews/:sessionId
 * - GET /api/reviews
 *
 * Uses port 4300 to avoid conflicts with other smoke tests.
 */

const TEST_PORT = 4300;

interface ReviewResponse {
    sessionId: string;
    reviewUrl: string;
    filesCount: number;
    title?: string;
}

interface GetSessionResponse {
    sessionId: string;
    status: string;
    files: unknown[];
    comments: unknown[];
    generalFeedback: string;
}

interface SessionListItem {
    id: string;
    title: string;
    filesCount: number;
    status: string;
    createdAt: string;
}

describe('HTTP API', () => {
    let server: ServerHandle;

    beforeAll(async () => {
        await killServerOnPort(TEST_PORT);
        server = await startServer({ port: TEST_PORT });
    });

    afterAll(async () => {
        await server?.stop();
    });

    describe('GET /api/health', () => {
        it('should return 200 OK', async () => {
            const { status, data } = await apiRequest<{ status: string }>(
                TEST_PORT,
                'GET',
                '/api/health'
            );

            expect(status).toBe(200);
            expect(data).toHaveProperty('status', 'ok');
        });
    });

    describe('POST /api/reviews', () => {
        it('should create a review for local files', async () => {
            const { status, data } = await apiRequest<ReviewResponse>(
                TEST_PORT,
                'POST',
                '/api/reviews',
                { source: 'local', files: ['package.json'] }
            );

            expect(status).toBe(201);
            expect(data).toHaveProperty('sessionId');
            expect(data).toHaveProperty('reviewUrl');
            expect(data).toHaveProperty('filesCount', 1);
        });

        it('should return error for invalid request', async () => {
            const { status } = await apiRequest<{ error: string }>(
                TEST_PORT,
                'POST',
                '/api/reviews',
                { source: 'invalid' }
            );

            expect(status).toBeGreaterThanOrEqual(400);
        });
    });

    describe('GET /api/sessions/:sessionId', () => {
        it('should return session details', async () => {
            // First create a session
            const createResult = await apiRequest<ReviewResponse>(
                TEST_PORT,
                'POST',
                '/api/reviews',
                { source: 'local', files: ['package.json'] }
            );

            const sessionId = createResult.data.sessionId;

            // Now get the session
            const { status, data } = await apiRequest<GetSessionResponse>(
                TEST_PORT,
                'GET',
                `/api/sessions/${sessionId}`
            );

            expect(status).toBe(200);
            expect(data).toHaveProperty('id', sessionId);
            expect(data).toHaveProperty('status');
            expect(data).toHaveProperty('files');
        });

        it('should return 404 for non-existent session', async () => {
            const { status } = await apiRequest<{ error: string }>(
                TEST_PORT,
                'GET',
                '/api/sessions/00000000-0000-0000-0000-000000000000'
            );

            expect(status).toBe(404);
        });
    });

    describe('GET /api/sessions', () => {
        it('should list all sessions', async () => {
            const { status, data } = await apiRequest<SessionListItem[]>(
                TEST_PORT,
                'GET',
                '/api/sessions'
            );

            expect(status).toBe(200);
            expect(Array.isArray(data)).toBe(true);
        });
    });

    describe('Review workflow', () => {
        it('should complete workflow: create -> add comment -> complete -> verify', async () => {
            // Step 1: Create review
            const createResponse = await apiRequest<{ sessionId: string; reviewUrl: string }>(
                TEST_PORT,
                'POST',
                '/api/reviews',
                {
                    source: 'local',
                    files: ['package.json'],
                }
            );

            expect(createResponse.status).toBe(201);
            const sessionId = createResponse.data.sessionId;

            // Step 2: Add a comment
            const commentResponse = await apiRequest(
                TEST_PORT,
                'POST',
                `/api/sessions/${sessionId}/comments`,
                {
                    filePath: 'package.json',
                    startLine: 1,
                    endLine: 1,
                    side: "old",
                    text: 'Test comment from e2e',
                }
            );

            expect(commentResponse.status).toBe(201);

            // Step 3: Complete review
            const completeResponse = await apiRequest(
                TEST_PORT,
                'POST',
                `/api/sessions/${sessionId}/complete`,
                {
                    status: 'approved',
                    generalFeedback: 'Looks good!',
                }
            );

            expect(completeResponse.status).toBe(200);

            // Step 4: Verify completed status
            const getResponse = await apiRequest<{
                id: string;
                status: string;
                generalFeedback: string;
                comments: Array<{ text: string }>;
            }>(TEST_PORT, 'GET', `/api/sessions/${sessionId}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.data).toHaveProperty('status', 'approved');
            expect(getResponse.data).toHaveProperty('generalFeedback', 'Looks good!');
            expect(getResponse.data.comments).toHaveLength(1);
            expect(getResponse.data.comments[0].text).toBe('Test comment from e2e');
        });
    });
});
