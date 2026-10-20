import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { openApiPath, repoRoot } from "./config.ts";
import { contractTools, loadOpenApiDocument } from "./openapi.ts";
import { contractLiscaTools } from "./tools-contract.ts";
import { cliLiscaTools } from "./tools-cli.ts";
import { serverLiscaTools } from "./tools-servers.ts";
import { waitLiscaTools } from "./tools-wait.ts";
import { workspaceLiscaTools } from "./tools-workspace.ts";
import { errorFrom, errorResult, type LiscaTool } from "./tool.ts";

export const MCP_SERVER_NAME = "lisca-mcp";
export const MCP_SERVER_VERSION = "0.1.0";

/** Build the ordered tool catalog: servers, contract routes, CLI, workspace, waits. */
export function liscaTools(): LiscaTool[] {
  const tools: LiscaTool[] = [
    ...serverLiscaTools(),
    ...contractLiscaTools(contractTools(loadOpenApiDocument(openApiPath()))),
    ...cliLiscaTools(),
    ...workspaceLiscaTools(),
    ...waitLiscaTools(),
  ];
  const names = new Set<string>();
  for (const tool of tools) {
    if (names.has(tool.name)) {
      throw new Error(`Duplicate tool name ${tool.name}`);
    }
    names.add(tool.name);
  }
  return tools;
}

function toMcpTool(tool: LiscaTool): Tool {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema as Tool["inputSchema"],
  };
}

/**
 * Assemble the Lisca MCP server. Uses the SDK's low-level `Server` so every
 * tool's input schema can stay the plain JSON Schema generated from
 * `packages/contracts/openapi.json`, with no Zod conversion in between.
 */
export function createLiscaMcpServer(): Server {
  const server = new Server(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    {
      capabilities: { tools: {} },
      instructions: [
        "Drive the whole LiSCA lineup from one place.",
        "",
        "Servers: contract tools call the product JSON APIs. Call server_status first — align_*/fs_* need the Aligner (19765) or Studio (19767) server, annotate_* the Annotator (19766) or Studio, and studio_*/profile_*/memory_* Studio only. server_start boots one.",
        "CLI: cli_analyze, cli_crop, and cli_fixture_workspace work straight off the repo without any server.",
        "Workspace: workspace_overview, workspace_read_file, and workspace_read_plot read a workspace folder directly.",
        "Long jobs: follow align_crop_roi, studio_start_analysis, and task-heavy work with crop_wait, analysis_wait, or task_wait.",
        `Repo root: ${repoRoot()} (override with LISCA_REPO_ROOT).`,
      ].join("\n"),
    },
  );
  const tools = liscaTools();
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: tools.map(toMcpTool) }));

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const tool = byName.get(request.params.name);
    if (!tool) {
      return errorResult(
        `Unknown tool ${JSON.stringify(request.params.name)}. List tools with tools/list.`,
      );
    }
    const args = request.params.arguments;
    if (args !== undefined && (typeof args !== "object" || args === null || Array.isArray(args))) {
      return errorResult(`Tool arguments must be a JSON object for ${tool.name}.`);
    }
    try {
      return await tool.handler(args ?? {});
    } catch (cause) {
      return errorFrom(cause);
    }
  });

  return server;
}
