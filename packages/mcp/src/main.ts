#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { httpPort } from "./config.ts";
import { startHttpMode } from "./http-server.ts";
import { createLiscaMcpServer } from "./server.ts";

/**
 * Entry point of the LiSCA MCP server. Two transports:
 *
 * - stdio (default), for MCP hosts that spawn lisca-mcp next to the checkout;
 * - remote Streamable HTTP (set LISCA_MCP_HTTP_PORT), for deployments where
 *   agents reach LiSCA over the network — a Docker container or lab host.
 *
 * Diagnostics go to stderr so the stdio protocol channel on stdout stays clean.
 */
async function main(): Promise<void> {
  if (httpPort() !== undefined) {
    const handle = await startHttpMode();
    const bye = (signal: string) => {
      process.stderr.write(`lisca-mcp: received ${signal}, closing.\n`);
      void handle.close().finally(() => process.exit(0));
    };
    process.on("SIGINT", () => bye("SIGINT"));
    process.on("SIGTERM", () => bye("SIGTERM"));
    return;
  }
  const server = createLiscaMcpServer();
  await server.connect(new StdioServerTransport());
  const bye = (signal: string) => {
    process.stderr.write(`lisca-mcp: received ${signal}, closing.\n`);
    void server.close().finally(() => process.exit(0));
  };
  process.on("SIGINT", () => bye("SIGINT"));
  process.on("SIGTERM", () => bye("SIGTERM"));
}

main().catch((cause: unknown) => {
  process.stderr.write(
    `lisca-mcp failed to start: ${cause instanceof Error ? cause.stack : String(cause)}\n`,
  );
  process.exit(1);
});
