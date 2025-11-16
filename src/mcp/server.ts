import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { askForReview } from './tools/askForReview.js';
import { AskForReviewInputSchema } from '../shared/schemas.js';

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

  // Register the ask_for_review tool
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'ask_for_review',
          description:
            'Open a browser-based code review UI and wait for the user to complete their review. ' +
            'Returns feedback with comments and approval status. This is a blocking operation.\n\n' +
            'If no arguments are provided the tool automatically reviews every uncommitted change ' +
            'in the current git repository.\n\n' +
            'Git mode examples:\n' +
            '- Uncommitted changes: {"files": ["src/app.ts"], "source": "uncommitted"}\n' +
            '- Specific commit: {"files": ["src/app.ts"], "source": "commit", "commitHash": "abc123"}\n' +
            '- Branch comparison: {"files": ["src/app.ts"], "source": "branch", "base": "main", "head": "feature"}',
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
                  'Git source: "uncommitted" for working tree changes, "commit" for specific commit, "branch" for branch comparison. Defaults to "uncommitted" and may be auto-detected when commit/branch fields are supplied.',
                default: 'uncommitted',
              },
              commitHash: {
                type: 'string',
                description: 'Commit hash (required when reviewing a commit)',
              },
              base: {
                type: 'string',
                description: 'Base branch/ref (required when comparing branches)',
              },
              head: {
                type: 'string',
                description: 'Head branch/ref (required when comparing branches)',
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
            },
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'ask_for_review') {
      try {
        const args = AskForReviewInputSchema.parse(request.params.arguments ?? {});

        const result = await askForReview(args);

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
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
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
