import { expect, test, describe, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CreateNamespaceResponseSchema } from "../src/models/response-schemas";
import { KubernetesManager } from "../src/utils/kubernetes-manager.js";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("kubernetes server operations", () => {
  let transport: StdioClientTransport;
  let client: Client;

  beforeEach(async () => {
    try {
      transport = new StdioClientTransport({
        command: "bun",
        args: ["src/index.ts"],
        stderr: "pipe",
      });

      client = new Client(
        {
          name: "test-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );
      await client.connect(transport);
      // Wait for connection to be fully established
      await sleep(1000);
    } catch (e) {
      console.error("Error in beforeEach:", e);
      throw e;
    }
  });

  afterEach(async () => {
    try {
      await transport.close();
      await sleep(1000);
    } catch (e) {
      console.error("Error during cleanup:", e);
    }
  });

  test("create namespace", async () => {
    const TEST_NAMESPACE_NAME = "test-namespace-mcp-server";

    const result = await client.request(
      {
        method: "tools/call",
        params: {
          name: "create_namespace",
          arguments: {
            name: TEST_NAMESPACE_NAME,
          },
        },
      },
      CreateNamespaceResponseSchema
    );

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              podName: TEST_NAMESPACE_NAME,
              status: "created",
            },
            null,
            2
          ),
        },
      ],
    });

    // Delete namespace after test using kubectl api directly since we don't have a delete_namespace tool yet
    const k8sManager = new KubernetesManager();
    await k8sManager.getCoreApi().deleteNamespace(TEST_NAMESPACE_NAME);
  });
});
