import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createReview } from './tools/createReview.js';
import { getReview } from './tools/getReview.js';
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
            'Create a code review session and return immediately with a review ID and URL. ' +
            'Does NOT block - use get_review to retrieve results.\n\n' +
            'If no arguments are provided, automatically reviews every uncommitted change ' +
            'in the current git repository.\n\n' +
            'Git mode examples:\n' +
            '- Uncommitted changes: {"source": "uncommitted"}\n' +
            '- Specific commit: {"source": "commit", "commitHash": "abc123"}\n' +
            '- Branch comparison: {"source": "branch", "base": "main", "head": "feature"}\n' +
            '- Disable browser opening: {"openBrowser": false}',
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
                enum: ['uncommitted', 'commit', 'branch'],
                description:
                  'Git source: "uncommitted" for working tree changes, "commit" for specific commit, "branch" for branch comparison. Defaults to "uncommitted".',
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
                description: 'Whether to open the review in a browser (default: true)',
                default: true,
              },
            },
          },
        },
        {
          name: 'get_review',
          description:
            'Retrieve review results for a given session ID.\n\n' +
            'Two modes:\n' +
            '1. Blocking (wait=true, default): Waits until review is completed, then returns results\n' +
            '2. Polling (wait=false): Returns current status immediately without blocking\n\n' +
            'Examples:\n' +
            '- Wait for completion: {"sessionId": "uuid", "wait": true}\n' +
            '- Check status: {"sessionId": "uuid", "wait": false}',
          inputSchema: {
            type: 'object',
            additionalProperties: false,
            required: ['sessionId'],
            properties: {
              sessionId: {
                type: 'string',
                description: 'The review session ID returned from create_review',
              },
              wait: {
                type: 'boolean',
                description: 'Whether to block until review completes (default: true)',
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
  const server = createMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log to stderr (stdout is used for MCP communication)
  console.error('Reagent MCP server started');

  return server;
}
