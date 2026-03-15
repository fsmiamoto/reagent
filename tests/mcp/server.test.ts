import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSetRequestHandler, mockConnect } = vi.hoisted(() => ({
  mockSetRequestHandler: vi.fn(),
  mockConnect: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/index.js", () => {
  class MockServer {
    setRequestHandler = mockSetRequestHandler;
    connect = mockConnect;
    serverInfo: unknown;
    options: unknown;
    constructor(serverInfo: unknown, options: unknown) {
      this.serverInfo = serverInfo;
      this.options = options;
    }
  }
  return { Server: MockServer };
});

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock("@src/mcp/tools/createReview", () => ({
  createReview: vi.fn(),
}));

vi.mock("@src/mcp/tools/getReview", () => ({
  getReview: vi.fn(),
}));

vi.mock("@src/version", () => ({
  getReagentVersion: vi.fn().mockReturnValue("2.5.0"),
}));

import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createMCPServer, startMCPServer } from "@src/mcp/server";
import { createReview } from "@src/mcp/tools/createReview";
import { getReview } from "@src/mcp/tools/getReview";

type HandlerFn = (request: Record<string, unknown>) => Promise<unknown>;

function getHandler(schema: unknown): HandlerFn {
  const call = mockSetRequestHandler.mock.calls.find(
    ([s]: [unknown]) => s === schema,
  );
  if (!call) throw new Error("Handler not registered for schema");
  return call[1] as HandlerFn;
}

describe("createMCPServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes version from getReagentVersion to Server constructor", () => {
    const server = createMCPServer() as unknown as {
      serverInfo: unknown;
      options: unknown;
    };

    expect(server.serverInfo).toEqual({ name: "reagent", version: "2.5.0" });
    expect(server.options).toEqual({ capabilities: { tools: {} } });
  });

  it("registers ListTools and CallTool handlers", () => {
    createMCPServer();

    expect(mockSetRequestHandler).toHaveBeenCalledTimes(2);
    const schemas = mockSetRequestHandler.mock.calls.map(([s]: [unknown]) => s);
    expect(schemas).toContain(ListToolsRequestSchema);
    expect(schemas).toContain(CallToolRequestSchema);
  });

  describe("ListTools handler", () => {
    it("returns create_review and get_review tools", async () => {
      createMCPServer();
      const handler = getHandler(ListToolsRequestSchema);

      const result = (await handler({})) as {
        tools: Array<{ name: string; inputSchema: unknown }>;
      };

      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].name).toBe("create_review");
      expect(result.tools[1].name).toBe("get_review");
    });

    it("includes inputSchema for each tool", async () => {
      createMCPServer();
      const handler = getHandler(ListToolsRequestSchema);

      const result = (await handler({})) as {
        tools: Array<{ name: string; inputSchema: { type: string } }>;
      };

      for (const tool of result.tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
      }
    });
  });

  describe("CallTool handler", () => {
    it("routes create_review to createReview and returns JSON result", async () => {
      const mockResult = {
        sessionId: "abc-123",
        reviewUrl: "http://localhost:3000/review/abc-123",
      };
      vi.mocked(createReview).mockResolvedValue(mockResult as never);

      createMCPServer();
      const handler = getHandler(CallToolRequestSchema);

      const response = (await handler({
        params: {
          name: "create_review",
          arguments: { source: "uncommitted", openBrowser: false },
        },
      })) as { content: Array<{ type: string; text: string }> };

      expect(createReview).toHaveBeenCalled();
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe("text");
      expect(JSON.parse(response.content[0].text)).toEqual(mockResult);
    });

    it("routes get_review to getReview and returns JSON result", async () => {
      const mockResult = { status: "approved", generalFeedback: "LGTM" };
      vi.mocked(getReview).mockResolvedValue(mockResult as never);

      createMCPServer();
      const handler = getHandler(CallToolRequestSchema);

      const sessionId = "550e8400-e29b-41d4-a716-446655440000";
      const response = (await handler({
        params: {
          name: "get_review",
          arguments: { sessionId, wait: false },
        },
      })) as { content: Array<{ type: string; text: string }> };

      expect(getReview).toHaveBeenCalled();
      expect(JSON.parse(response.content[0].text)).toEqual(mockResult);
    });

    it("defaults to empty object when arguments are undefined", async () => {
      vi.mocked(createReview).mockResolvedValue({} as never);

      createMCPServer();
      const handler = getHandler(CallToolRequestSchema);

      // arguments undefined — should default to {}
      await handler({
        params: { name: "create_review" },
      });

      expect(createReview).toHaveBeenCalled();
    });

    it("returns error response for unknown tool name", async () => {
      createMCPServer();
      const handler = getHandler(CallToolRequestSchema);

      const response = (await handler({
        params: { name: "nonexistent_tool", arguments: {} },
      })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toBe(
        "Error: Unknown tool: nonexistent_tool",
      );
    });

    it("returns error response when tool throws an Error", async () => {
      vi.mocked(createReview).mockRejectedValue(new Error("API down"));

      createMCPServer();
      const handler = getHandler(CallToolRequestSchema);

      const response = (await handler({
        params: {
          name: "create_review",
          arguments: { source: "uncommitted", openBrowser: false },
        },
      })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toBe("Error: API down");
    });

    it("returns 'Unknown error' when tool throws a non-Error", async () => {
      vi.mocked(createReview).mockRejectedValue("string error");

      createMCPServer();
      const handler = getHandler(CallToolRequestSchema);

      const response = (await handler({
        params: {
          name: "create_review",
          arguments: { source: "uncommitted", openBrowser: false },
        },
      })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toBe("Error: Unknown error");
    });

    it("returns error for invalid Zod input (schema validation)", async () => {
      createMCPServer();
      const handler = getHandler(CallToolRequestSchema);

      const response = (await handler({
        params: {
          name: "get_review",
          arguments: { sessionId: "not-a-uuid" },
        },
      })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("Error:");
    });
  });
});

describe("startMCPServer", () => {
  it("creates server, connects with stdio transport, and logs to stderr", async () => {
    const stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockConnect.mockResolvedValue(undefined);

    const server = await startMCPServer();

    expect(server).toBeDefined();
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(stderrSpy).toHaveBeenCalledWith("Reagent MCP server started");

    stderrSpy.mockRestore();
  });
});
