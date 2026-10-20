import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { httpHost, httpPath, httpPort, httpToken } from "./config.ts";
import { createLiscaMcpServer, liscaTools } from "./server.ts";

/**
 * Remote mode for lisca-mcp: speak MCP over Streamable HTTP instead of stdio,
 * for deployments where the agent is not on the same machine (a Docker
 * container, a lab workstation). Stateless — every POST gets a fresh transport
 * and server instance, so any number of agents can share the endpoint.
 */

/** Cap for one JSON-RPC request body. Tools never upload pixels, so this is roomy. */
const MAX_BODY_BYTES = 4 * 1024 * 1024;

let cachedToolCount = 0;

/** Build the tool catalog once; server instances per request are cheap after that. */
export function toolCount(): number {
  if (cachedToolCount === 0) {
    cachedToolCount = liscaTools().length;
  }
  return cachedToolCount;
}

export type HttpModeHandle = {
  server: Server;
  url: string;
  close: () => Promise<void>;
};

/** Start the remote MCP endpoint. `port: 0` binds an ephemeral port (used by tests). */
export async function startHttpMode(overrides?: {
  host?: string;
  port?: number;
  token?: string;
}): Promise<HttpModeHandle> {
  const host = overrides?.host ?? httpHost();
  const requestedPort = overrides?.port ?? httpPort();
  const token = overrides?.token ?? httpToken();
  if (requestedPort === undefined) {
    throw new Error("Set LISCA_MCP_HTTP_PORT to run lisca-mcp in remote (Streamable HTTP) mode.");
  }
  const endpoint = httpPath();

  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    void handleRequest(request, response, { token, endpoint }).catch((cause: unknown) => {
      if (!response.headersSent) {
        response.writeHead(500, { "content-type": "application/json" });
      }
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: cause instanceof Error ? cause.message : String(cause) },
          id: null,
        }),
      );
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(requestedPort, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : requestedPort;
      process.stderr.write(
        `lisca-mcp: remote mode on http://${host}:${port}${endpoint} with ${toolCount()} tools` +
          `${token ? " (bearer token required)" : ""}.\n`,
      );
      resolve({
        server,
        url: `http://${host}:${port}${endpoint}`,
        close: () =>
          new Promise<void>((resolveClose) => {
            server.close(() => resolveClose());
          }),
      });
    });
  });
}

type RequestContext = {
  token: string | undefined;
  endpoint: string;
};

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: RequestContext,
) {
  if (request.url === undefined || request.url.split("?")[0] !== context.endpoint) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: `lisca-mcp serves only ${context.endpoint}.` }));
    return;
  }
  if (context.token !== undefined) {
    const expected = `Bearer ${context.token}`;
    if (request.headers.authorization !== expected) {
      response.writeHead(401, {
        "content-type": "application/json",
        "www-authenticate": 'Bearer realm="lisca-mcp"',
      });
      response.end(
        JSON.stringify({ error: "Missing or invalid bearer token (LISCA_MCP_HTTP_TOKEN)." }),
      );
      return;
    }
  }
  if (request.method !== "POST") {
    // Stateless mode: no sessions, no server-initiated SSE stream.
    response.writeHead(405, { allow: "POST", "content-type": "application/json" });
    response.end(JSON.stringify({ error: "POST JSON-RPC requests only." }));
    return;
  }
  const body = await readJsonBody(request);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcpServer = createLiscaMcpServer();
  response.once("close", () => {
    void transport.close();
    void mcpServer.close();
  });
  await mcpServer.connect(transport);
  await transport.handleRequest(request, response, body);
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = chunk instanceof Buffer ? chunk : Buffer.from(chunk as string);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error(`JSON-RPC body exceeds ${MAX_BODY_BYTES} bytes.`);
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) {
    throw new Error("Empty request body.");
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
