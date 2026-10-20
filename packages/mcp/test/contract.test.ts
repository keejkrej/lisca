import { createServer, type IncomingMessage, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { contractTools, loadOpenApiDocument } from "../src/openapi.ts";
import { contractLiscaTools } from "../src/tools-contract.ts";
import path from "node:path";

const CONTRACTS_DIR = path.resolve(import.meta.dirname, "../../contracts");
const tools = contractLiscaTools(
  contractTools(loadOpenApiDocument(path.join(CONTRACTS_DIR, "openapi.json"))),
);
const byName = new Map(tools.map((tool) => [tool.name, tool]));

interface Recorded {
  method: string;
  url: string;
  body: unknown;
  authorization: string | undefined;
}

/** Tiny JSON mock standing in for a product server. */
function mockApi(
  handler: (request: Recorded) => unknown,
): Promise<{ server: Server; url: string; seen: Recorded[] }> {
  const seen: Recorded[] = [];
  const server = createServer((request: IncomingMessage, response) => {
    let raw = "";
    request.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    request.on("end", () => {
      const recorded: Recorded = {
        method: request.method ?? "GET",
        url: request.url ?? "/",
        body: raw.length > 0 ? (JSON.parse(raw) as unknown) : undefined,
        authorization: request.headers.authorization,
      };
      seen.push(recorded);
      const payload = JSON.stringify(handler(recorded));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(payload);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}`, seen });
    });
  });
}

let cleanup: (() => void)[] = [];

afterEach(() => {
  for (const stop of cleanup) {
    stop();
  }
  cleanup = [];
  delete process.env.LISCA_MCP_STUDIO_URL;
  delete process.env.LISCA_MCP_PROFILE_TOKEN;
});

function resultJson(result: CallToolResult): any {
  expect(result.isError).toBeFalsy();
  const text = (result.content ?? []).find((block) => block.type === "text");
  return JSON.parse((text as { text: string }).text);
}

describe("contract tools against a mocked product server", () => {
  it("calls a GET route with query parameters", async () => {
    const { server, url, seen } = await mockApi(() => ({ home: "/Users/droid" }));
    cleanup.push(() => server.close());
    process.env.LISCA_MCP_STUDIO_URL = url;

    const tool = byName.get("fs_user_home_directory")!;
    const result = await tool.handler({});
    expect(resultJson(result)).toEqual({ home: "/Users/droid" });
    expect(seen[0].method).toBe("GET");
    expect(seen[0].url).toBe("/fs/home");
  });

  it("splits query parameters and body for POST routes and forwards the product selector", async () => {
    const { server, url, seen } = await mockApi((request) => ({ echo: request.body }));
    cleanup.push(() => server.close());
    process.env.LISCA_MCP_STUDIO_URL = url;

    const scan = byName.get("align_scan_source")!;
    const result = await scan.handler({
      product: "studio",
      source: { type: "nd2", path: "/data/acq.nd2" },
    });
    expect(resultJson(result)).toEqual({
      echo: { source: { type: "nd2", path: "/data/acq.nd2" } },
    });
    expect(seen[0].method).toBe("POST");
    expect(seen[0].url).toBe("/align/scan-source");
    expect(seen[0].body).toEqual({ source: { type: "nd2", path: "/data/acq.nd2" } });

    const alignState = byName.get("align_load_align_state")!;
    await alignState.handler({ workspacePath: "/w", pos: "3", product: "studio" });
    expect(seen[1].method).toBe("GET");
    expect(seen[1].url).toBe("/align/align-state?workspacePath=%2Fw&pos=3");
    expect(seen[1].body).toBeUndefined();
  });

  it("rejects a product that does not serve the route", async () => {
    const scan = byName.get("align_scan_source")!;
    const result = await scan.handler({ product: "annotator", source: { type: "nd2", path: "x" } });
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toMatch(/aligner or studio/i);
  });

  it("sends the bearer token when LISCA_MCP_PROFILE_TOKEN is set", async () => {
    const { server, url, seen } = await mockApi(() => null);
    cleanup.push(() => server.close());
    process.env.LISCA_MCP_STUDIO_URL = url;
    process.env.LISCA_MCP_PROFILE_TOKEN = "token-123";

    await byName.get("memory_get_recent_memory")!.handler({});
    expect(seen[0].authorization).toBe("Bearer token-123");
  });

  it("surfaces HTTP errors as isError with the server answer", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(422, { "content-type": "application/json" });
      response.end(JSON.stringify({ message: "source must be an ND2, CZI, or folder" }));
    });
    const url = await listen(server);
    cleanup.push(() => server.close());
    process.env.LISCA_MCP_STUDIO_URL = url;

    const result = await byName.get("align_scan_source")!.handler({
      source: { type: "nd2", path: "nope" },
    });
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toMatch(/HTTP 422/);
    expect((result.content[0] as { text: string }).text).toMatch(/ND2, CZI, or folder/);
  });

  it("renders frame payloads as PNG images", async () => {
    const pixels = Buffer.from([0, 100, 200, 255]);
    const { server, url } = await mockApi(() => ({
      width: 2,
      height: 2,
      dataBase64: pixels.toString("base64"),
      pixelType: "uint8",
      suggestedContrast: { min: 0, max: 255 },
    }));
    cleanup.push(() => server.close());
    process.env.LISCA_MCP_STUDIO_URL = url;

    const result = await byName.get("align_load_frame")!.handler({
      source: { type: "nd2", path: "/data/acq.nd2" },
      request: { pos: 1, channel: 0, time: 0, z: 0 },
    });
    expect(result.isError).toBeFalsy();
    const image = result.content.find((block) => block.type === "image");
    expect(image).toBeDefined();
    const text = result.content.find((block) => block.type === "text") as { text: string };
    expect(text.text).not.toContain(pixels.toString("base64"));
    expect(JSON.parse(text.text).renderedContrast).toEqual({ min: 0, max: 255 });
  });

  it("tells the agent to start a server when none is reachable", async () => {
    const result = await byName
      .get("studio_list_label_free_references")!
      .handler({ workspacePath: "/w" });
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toMatch(/server_start/);
  });
});

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}
