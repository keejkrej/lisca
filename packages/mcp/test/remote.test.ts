import { afterEach, describe, expect, it } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { isLoopbackTarget } from "../src/config.ts";
import { startHttpMode } from "../src/http-server.ts";
import { serverLiscaTools } from "../src/tools-servers.ts";

const tools = serverLiscaTools();
const status = tools.find((tool) => tool.name === "server_status")!;
const start = tools.find((tool) => tool.name === "server_start")!;
const stop = tools.find((tool) => tool.name === "server_stop")!;

const envKeys = [
  "LISCA_MCP_HOST",
  "LISCA_MCP_STUDIO_URL",
  "LISCA_MCP_ALIGNER_URL",
  "LISCA_MCP_ANNOTATOR_URL",
  "LISCA_MCP_HTTP_TOKEN",
  "LISCA_MCP_HTTP_HOST",
] as const;

afterEach(() => {
  for (const key of envKeys) {
    delete process.env[key];
  }
});

function text(result: CallToolResult): string {
  return (result.content[0] as { text: string }).text;
}

/** Parse a JSON-RPC response whether the endpoint answered with plain JSON or an
 * SSE stream (the transport defaults to event-stream replies). */
async function readRpc(response: Response): Promise<any> {
  const body = await response.text();
  if (body.trimStart().startsWith("{")) {
    return JSON.parse(body) as unknown;
  }
  const data = body
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());
  if (data.length === 0) {
    throw new Error(`Response carried no JSON-RPC message:\n${body.slice(0, 200)}`);
  }
  return JSON.parse(data.join("")) as unknown;
}

describe("isLoopbackTarget", () => {
  it("classifies product URLs", () => {
    expect(isLoopbackTarget("http://127.0.0.1:19767")).toBe(true);
    expect(isLoopbackTarget("http://localhost:19767")).toBe(true);
    expect(isLoopbackTarget("http://127.0.0.1:19765/")).toBe(true);
    expect(isLoopbackTarget("http://[::1]:19767")).toBe(true);
    expect(isLoopbackTarget("http://0.0.0.0:19767")).toBe(false);
    expect(isLoopbackTarget("http://192.168.1.20:19767")).toBe(false);
    expect(isLoopbackTarget("https://lisca.lan.example:19767")).toBe(false);
    expect(isLoopbackTarget("not a url")).toBe(false);
  });
});

describe("remote product deployments", () => {
  it("server_status marks remote targets and points at their tooling", async () => {
    process.env.LISCA_MCP_STUDIO_URL = "http://192.0.2.10:19767";
    process.env.LISCA_MCP_HOST = "192.0.2.11"; // aligner + annotator
    const report = JSON.parse(text(await status.handler({})) as string) as {
      servers: { product: string; remote: boolean; url: string }[];
      hint?: string;
    };
    expect(report.servers.find((row) => row.product === "studio")?.remote).toBe(true);
    expect(report.servers.find((row) => row.product === "aligner")?.url).toBe(
      "http://192.0.2.11:19765",
    );
    expect(report.hint).toMatch(/own tooling/);
  });

  it("server_start refuses to spawn binaries for a remote target", async () => {
    process.env.LISCA_MCP_STUDIO_URL = "http://lisca.internal.example:19767";
    const result = await start.handler({ product: "studio" });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/not on this machine/);
    expect(text(result)).toMatch(/LISCA_MCP_STUDIO_URL/);
  });

  it("server_stop refuses remote targets too", async () => {
    process.env.LISCA_MCP_ANNOTATOR_URL = "http://192.0.2.10:19766";
    const result = await stop.handler({ product: "annotator" });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/deployment tooling/);
  });

  it("still starts local servers when every target is loopback", async () => {
    // No binaries exist in this checkout's target/, so this is the error path —
    // but it proves the remote guard does not fire for loopback defaults.
    process.env.LISCA_MCP_STUDIO_URL = "http://127.0.0.1:19767";
    const result = await start.handler({ product: "studio" });
    expect(result.isError).toBe(true);
    expect(text(result)).not.toMatch(/not on this machine/);
    expect(text(result)).toMatch(/target\/release|binary|build/);
  });
});

describe("remote MCP endpoint (Streamable HTTP mode)", () => {
  it("speaks MCP over HTTP end to end", async () => {
    const handle = await startHttpMode({ host: "127.0.0.1", port: 0 });
    try {
      const init = await fetch(handle.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "lisca-mcp-test", version: "0.0.0" },
          },
        }),
      });
      expect(init.status).toBe(200);
      const initBody = (await readRpc(init)) as { result: { serverInfo: { name: string } } };
      expect(initBody.result.serverInfo.name).toBe("lisca-mcp");

      const listed = await fetch(handle.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
      });
      const listBody = (await readRpc(listed)) as { result: { tools: { name: string }[] } };
      const names = listBody.result.tools.map((tool) => tool.name);
      expect(names).toContain("align_scan_source");
      expect(names).toContain("server_status");

      const called = await fetch(handle.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "server_status", arguments: {} },
        }),
      });
      const callBody = (await readRpc(called)) as { result: CallToolResult };
      expect(callBody.result.isError).toBeFalsy();
      expect(callBody.result.content[0].type).toBe("text");
    } finally {
      await handle.close();
    }
  });

  it("requires the bearer token when LISCA_MCP_HTTP_TOKEN is set", async () => {
    const handle = await startHttpMode({ host: "127.0.0.1", port: 0, token: "secret-token" });
    try {
      const anonymous = await fetch(handle.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });
      expect(anonymous.status).toBe(401);

      const authorized = await fetch(handle.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          authorization: "Bearer secret-token",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
      });
      expect(authorized.status).toBe(200);
    } finally {
      await handle.close();
    }
  });

  it("rejects GET streams and foreign paths in stateless mode", async () => {
    const handle = await startHttpMode({ host: "127.0.0.1", port: 0 });
    try {
      const get = await fetch(handle.url);
      expect(get.status).toBe(405);

      const elsewhere = await fetch(new URL("/other", handle.url).toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });
      expect(elsewhere.status).toBe(404);
    } finally {
      await handle.close();
    }
  });

  it("refuses to start without a port", async () => {
    process.env.LISCA_MCP_HTTP_PORT = "";
    await expect(startHttpMode({ port: undefined })).rejects.toThrow(/LISCA_MCP_HTTP_PORT/);
  });
});
