import { afterEach, describe, expect, it } from "vitest";
import {
  apiRequest,
  cleanupLockFile,
  sleep,
  startServer,
  ServerHandle,
  tryRunCli,
} from "./utils";

const TEST_PORT = 4600;

describe("Stop Command", () => {
  let server: ServerHandle | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
    cleanupLockFile();
  });

  it("stops the running server and removes the lock file", async () => {
    server = await startServer({ port: TEST_PORT });

    const result = tryRunCli(["stop"]);
    expect(result.success).toBe(true);
    expect(result.output).toContain("Server stopped");

    server = null;

    await sleep(500);

    await expect(apiRequest(TEST_PORT, "GET", "/api/health")).rejects.toThrow();
  });
});
