import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import {
    startServer,
    killServerOnPort,
    apiRequest,
    sleep,
    ServerHandle,
} from './utils';

/**
 * MCP Server E2E Tests
 *
 * Tests the MCP server functionality via JSON-RPC over stdio:
 * - Tool listing (list_tools)
 * - create_review tool
 * - get_review tool
 *
 * Uses port 4400 to avoid conflicts with other e2e tests.
 */

const TEST_PORT = 4400;
const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
const CLI_PATH = path.join(PROJECT_ROOT, 'dist/index.js');

interface MCPResponse {
    jsonrpc: '2.0';
    id: number;
    result?: unknown;
    error?: { code: number; message: string };
}

interface MCPRequest {
    jsonrpc: '2.0';
    id: number;
    method: string;
    params?: unknown;
}

/**
 * Send a JSON-RPC request to the MCP server and wait for response.
 */
async function sendMCPRequest(
    proc: ChildProcess,
    method: string,
    params?: unknown,
    id = 1
): Promise<MCPResponse> {
    const request: MCPRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
    };

    return new Promise((resolve, reject) => {
        let buffer = '';
        const timeout = setTimeout(() => {
            reject(new Error(`MCP request timed out: ${method}`));
        }, 10000);

        const onData = (data: Buffer) => {
            buffer += data.toString();
            // Try to parse complete JSON responses
            const lines = buffer.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const response = JSON.parse(line) as MCPResponse;
                        if (response.id === id) {
                            clearTimeout(timeout);
                            proc.stdout?.off('data', onData);
                            resolve(response);
                            return;
                        }
                    } catch {
                        // Not valid JSON yet, continue buffering
                    }
                }
            }
        };

        proc.stdout?.on('data', onData);
        proc.stdin?.write(JSON.stringify(request) + '\n');
    });
}

/**
 * Start the MCP server process.
 */
function startMCPServer(): ChildProcess {
    const proc = spawn('node', [CLI_PATH, 'mcp'], {
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    return proc;
}

describe('MCP Server', () => {
    let webServer: ServerHandle;
    let mcpProcess: ChildProcess;

    beforeAll(async () => {
        // Start web server first (MCP server needs it)
        await killServerOnPort(TEST_PORT);
        webServer = await startServer({ port: TEST_PORT });

        // Start MCP server process
        mcpProcess = startMCPServer();

        // Wait for MCP server to initialize
        await sleep(1000);
    });

    afterAll(async () => {
        // Kill MCP process
        if (mcpProcess) {
            mcpProcess.kill('SIGTERM');
        }

        // Stop web server
        await webServer?.stop();
    });

    describe('tools/list', () => {
        it('should list available tools', async () => {
            const response = await sendMCPRequest(mcpProcess, 'tools/list', {});

            expect(response.error).toBeUndefined();
            expect(response.result).toBeDefined();

            const result = response.result as { tools: Array<{ name: string }> };
            expect(result.tools).toHaveLength(2);

            const toolNames = result.tools.map((t) => t.name);
            expect(toolNames).toContain('create_review');
            expect(toolNames).toContain('get_review');
        });
    });

    describe('tools/call - create_review', () => {
        it('should create a review for local files', async () => {
            const response = await sendMCPRequest(mcpProcess, 'tools/call', {
                name: 'create_review',
                arguments: {
                    source: 'local',
                    files: ['package.json'],
                    openBrowser: false,
                },
            });

            expect(response.error).toBeUndefined();
            expect(response.result).toBeDefined();

            const result = response.result as { content: Array<{ type: string; text: string }> };
            expect(result.content).toHaveLength(1);
            expect(result.content[0].type).toBe('text');

            const data = JSON.parse(result.content[0].text);
            expect(data).toHaveProperty('sessionId');
            expect(data).toHaveProperty('reviewUrl');
            expect(data.reviewUrl).toContain(`localhost:${TEST_PORT}`);
            expect(data).toHaveProperty('filesCount', 1);
        });

        it('should return error for invalid source', async () => {
            const response = await sendMCPRequest(
                mcpProcess,
                'tools/call',
                {
                    name: 'create_review',
                    arguments: {
                        source: 'invalid',
                    },
                },
                2
            );

            expect(response.result).toBeDefined();

            const result = response.result as { content: Array<{ text: string }>; isError?: boolean };
            expect(result.isError).toBe(true);
        });
    });

    describe('tools/call - get_review', () => {
        it('should get review status in non-blocking mode', async () => {
            // First create a review
            const createResponse = await sendMCPRequest(
                mcpProcess,
                'tools/call',
                {
                    name: 'create_review',
                    arguments: {
                        source: 'local',
                        files: ['package.json'],
                        openBrowser: false,
                    },
                },
                3
            );

            const createResult = createResponse.result as { content: Array<{ text: string }> };
            const createData = JSON.parse(createResult.content[0].text);
            const sessionId = createData.sessionId;

            // Get review status (non-blocking)
            const getResponse = await sendMCPRequest(
                mcpProcess,
                'tools/call',
                {
                    name: 'get_review',
                    arguments: {
                        sessionId,
                        wait: false,
                    },
                },
                4
            );

            expect(getResponse.error).toBeUndefined();

            const getResult = getResponse.result as { content: Array<{ text: string }> };
            const getData = JSON.parse(getResult.content[0].text);

            expect(getData).toHaveProperty('status', 'pending');
        });

        it('should return error for non-existent session', async () => {
            const response = await sendMCPRequest(
                mcpProcess,
                'tools/call',
                {
                    name: 'get_review',
                    arguments: {
                        sessionId: '00000000-0000-0000-0000-000000000000',
                        wait: false,
                    },
                },
                5
            );

            const result = response.result as { content: Array<{ text: string }>; isError?: boolean };
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('not found');
        });
    });
});
