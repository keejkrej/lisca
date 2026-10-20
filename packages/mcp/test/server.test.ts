import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { createLiscaMcpServer, liscaTools } from "../src/server.ts";

async function connectedClient() {
  const server = createLiscaMcpServer();
  const client = new Client({ name: "lisca-mcp-test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("lisca MCP server", () => {
  it("lists every contract and helper tool with input schemas", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);

    // Whole lineup: product servers, all three products' routes, CLI, waits.
    expect(names).toContain("server_start");
    expect(names).toContain("server_status");
    expect(names).toContain("align_scan_source");
    expect(names).toContain("align_crop_roi");
    expect(names).toContain("annotate_scan_roi_workspace");
    expect(names).toContain("annotate_smart_segment");
    expect(names).toContain("studio_start_analysis");
    expect(names).toContain("studio_get_analysis_results");
    expect(names).toContain("fs_list_directory");
    expect(names).toContain("tasks_list_tasks");
    expect(names).toContain("profile_list_profiles");
    expect(names).toContain("cli_analyze");
    expect(names).toContain("cli_crop");
    expect(names).toContain("cli_fixture_workspace");
    expect(names).toContain("workspace_overview");
    expect(names).toContain("workspace_read_plot");
    expect(names).toContain("task_wait");
    expect(names).toContain("analysis_wait");
    expect(names).toContain("crop_wait");
    expect(tools.length).toBeGreaterThan(50);

    for (const tool of tools) {
      expect(tool.description?.length).toBeGreaterThan(20);
      const schema = tool.inputSchema as { type: string; properties?: Record<string, unknown> };
      expect(schema.type).toBe("object");
      if (tool.name === "align_scan_source") {
        expect(schema.properties?.source).toBeDefined();
        expect(schema.properties?.product).toBeDefined();
      }
    }
  });

  it("answers server_status with one row per product", async () => {
    const client = await connectedClient();
    const result = (await client.callTool({
      name: "server_status",
      arguments: {},
    })) as CallToolResult;
    expect(result.isError).toBeFalsy();
    const text = result.content.find((block) => block.type === "text") as { text: string };
    const parsed = JSON.parse(text.text) as {
      servers: { product: string; running: boolean }[];
    };
    expect(parsed.servers.map((row) => row.product)).toEqual(["aligner", "annotator", "studio"]);
  });

  it("reports unknown tools as errors", async () => {
    const client = await connectedClient();
    const result = (await client.callTool({
      name: "not_a_lisca_tool",
      arguments: {},
    })) as CallToolResult;
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toMatch(/Unknown tool/);
  });

  it("rejects malformed tool arguments at the protocol layer", async () => {
    const client = await connectedClient();
    await expect(
      client.callTool({
        name: "server_status",
        arguments: ["not", "an", "object"] as unknown as Record<string, unknown>,
      }),
    ).rejects.toThrow(/expected record/);
  });
});

describe("liscaTools", () => {
  it("builds the full catalog without a running server", () => {
    const tools = liscaTools();
    expect(tools.length).toBeGreaterThan(50);
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
  });
});
