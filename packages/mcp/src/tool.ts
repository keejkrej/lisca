import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { prettyJson, textBlock } from "./content.ts";

/**
 * One MCP tool. Input schemas are plain JSON Schema objects — the same shape
 * the wire protocol exchanges, and the same shape `openapi.json` generates.
 */
export interface LiscaTool {
  name: string;
  title: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
}

/** A successful tool result carrying pretty JSON. */
export function jsonResult(value: unknown): CallToolResult {
  return { content: [textBlock(prettyJson(value))] };
}

export function textResult(text: string): CallToolResult {
  return { content: [textBlock(text)] };
}

export function errorResult(message: string): CallToolResult {
  return { content: [textBlock(message)], isError: true };
}

export function errorFrom(value: unknown): CallToolResult {
  const message =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  return errorResult(message);
}
