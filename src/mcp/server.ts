import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createReview } from './tools/createReview.js';
import { getReview } from './tools/getReview.js';
import { ensureServerRunning } from '../web/lifecycle.js';
import {
  CreateReviewInputSchema,
  GetReviewInputSchema,
} from '../shared/schemas.js';

/**
 * Initialize and configure the MCP server
 */
export function createMCPServer() {
  const server = new Server(
    {
      name: 'reagent',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register review tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'create_review',
          description:
            '**WORKFLOW STEP 1 of 2**: Create a code review session and return immediately with a review URL.\n\n' +
            'This tool initiates a review session but does NOT wait for completion. After calling this tool:\n' +
            '1. Show the returned `reviewUrl` to the user (REQUIRED - user provides feedback here)\n' +
            '2. Then call `get_review` with the `sessionId` to retrieve the completed review results\n\n' +
            'Returns: {sessionId: string, reviewUrl: string, filesCount: number, title?: string}\n\n' +
            'USAGE:\n' +
            'If no arguments provided, automatically reviews every uncommitted change in the current git repository.\n\n' +
            'Review mode examples:\n' +
            '- Uncommitted changes: {"source": "uncommitted"}\n' +
            '- Specific commit: {"source": "commit", "commitHash": "abc123"}\n' +
            '- Branch comparison: {"source": "branch", "base": "main", "head": "feature"}\n' +
            '- Local files (no Git): {"source": "local", "files": ["src/app.ts", "README.md"]}\n' +
            '- Disable browser opening: {"openBrowser": false}\n\n' +
            'NOTE: Local mode requires the "files" parameter and does not use Git. Files are read directly from the filesystem.\n\n' +
            'COMPLETE WORKFLOW EXAMPLE:\n' +
            '1. Call: create_review({"source": "uncommitted"})\n' +
            '2. Receive: {sessionId: "abc-123", reviewUrl: "http://localhost:3000/review/abc-123", ...}\n' +
            '3. Show URL to user: "Please review the changes at http://localhost:3000/review/abc-123"\n' +
            '4. Call: get_review({"sessionId": "abc-123", "wait": true})\n' +
            '5. Receive: {status: "changes_requested", generalFeedback: "...", comments: [...]}',
          inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              files: {
                type: 'array',
                description:
                  'Optional list of file paths or directories. When omitted, all detected changes are reviewed.',
                items: { type: 'string' },
              },
              source: {
                type: 'string',
                enum: ['uncommitted', 'commit', 'branch', 'local'],
                description:
                  'Review source: "uncommitted" for Git working tree changes, "commit" for specific commit, "branch" for branch comparison, "local" for non-Git files (requires "files" parameter). Defaults to "uncommitted".',
                default: 'uncommitted',
              },
              commitHash: {
                type: 'string',
                description: 'Commit hash (required when source is "commit")',
              },
              base: {
                type: 'string',
                description: 'Base branch/ref (required when source is "branch")',
              },
              head: {
                type: 'string',
                description: 'Head branch/ref (required when source is "branch")',
              },
              workingDirectory: {
                type: 'string',
                description: 'Git repository path (optional, defaults to cwd)',
              },
              title: {
                type: 'string',
                description: 'Review title (optional, auto-generated if not provided)',
              },
              description: {
                type: 'string',
                description: 'Review description (optional)',
              },
              openBrowser: {
                type: 'boolean',
                description: 'Whether to automatically open the review URL in the default browser (default: true). Set to false in remote/headless environments.',
                default: true,
              },
            },
          },
        },
        {
          name: 'get_review',
          description:
            '**WORKFLOW STEP 2 of 2**: Retrieve review results using the sessionId from create_review.\n\n' +
            '(See create_review description for complete workflow example)\n\n' +
            'Call this AFTER create_review and AFTER showing the reviewUrl to the user. ' +
            'This tool waits for the user to complete their review in the browser UI.\n\n' +
            'Returns: {status: "approved"|"changes_requested", generalFeedback: string, comments: [...], timestamp: Date}\n\n' +
            'MODES:\n' +
            '- Blocking (wait=true, default): Waits until review is completed by the user, then returns full results\n' +
            '- Polling (wait=false): Returns current status immediately without blocking\n\n' +
            'Examples:\n' +
            '- Wait for completion: {"sessionId": "uuid-from-create-review", "wait": true}\n' +
            '- Check status: {"sessionId": "uuid-from-create-review", "wait": false}',
          inputSchema: {
            type: 'object',
            additionalProperties: false,
            required: ['sessionId'],
            properties: {
              sessionId: {
                type: 'string',
                description: 'The review session ID returned from create_review (found in the sessionId field of the response)',
              },
              wait: {
                type: 'boolean',
                description: 'Whether to block until user completes the review in browser (default: true). Set to false for status polling.',
                default: true,
              },
            },
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;

    try {
      let result: unknown;

      switch (toolName) {
        case 'create_review': {
          const args = CreateReviewInputSchema.parse(request.params.arguments ?? {});
          result = await createReview(args);
          break;
        }

        case 'get_review': {
          const args = GetReviewInputSchema.parse(request.params.arguments ?? {});
          result = await getReview(args);
          break;
        }

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });


  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMCPServer() {
  await ensureServerRunning();

  const server = createMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log to stderr (stdout is used for MCP communication)
  console.error('Reagent MCP server started');

  return server;
}
