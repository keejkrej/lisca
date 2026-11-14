import openApi from "@lisca/contracts/openapi.json";
import { contractTools, type OpenApiDocument } from "@lisca/contracts/agent-tools";
import type { ProductId } from "@lisca/contracts/agent-routing";
import { createDesktopFetch, liscaDesktopBridge } from "./infra/desktop";

/** Minimal structural types keep the draft browser API optional. */
export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean };
  execute: (input: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<unknown>;
}

export interface WebMcpContext {
  registerTool: (tool: WebMcpTool, options: { signal: AbortSignal }) => void;
}

/** Register the current product's contract operations, never arbitrary URLs or other products. */
export function installWebMcp(
  product: ProductId,
  options: { context?: WebMcpContext; fetch?: typeof fetch } = {},
): () => void {
  const context =
    options.context ??
    (typeof document === "undefined"
      ? undefined
      : (document as Document & { modelContext?: WebMcpContext }).modelContext);
  if (!context) return () => {};

  const bridge = liscaDesktopBridge();
  const transport = options.fetch ?? (bridge ? createDesktopFetch(bridge) : globalThis.fetch);
  const controller = new AbortController();
  try {
    for (const tool of contractTools(openApi as OpenApiDocument)) {
      if (!tool.products.includes(product)) continue;
      const { product: _selector, ...properties } = tool.inputSchema.properties;
      context.registerTool(
        {
          name: tool.name,
          description: `${tool.operationId}: ${tool.method} ${tool.path} on this ${product} instance. Paths refer to the server filesystem. Saved changes may require reloading the view.`,
          inputSchema: { ...tool.inputSchema, properties, additionalProperties: false },
          annotations: { readOnlyHint: tool.method === "GET" },
          async execute(input, { signal }) {
            if (!input || typeof input !== "object" || Array.isArray(input)) {
              throw new Error("Expected an object of tool arguments");
            }
            for (const name of Object.keys(input)) {
              if (!Object.hasOwn(properties, name)) throw new Error(`Unknown argument: ${name}`);
            }
            for (const name of tool.inputSchema.required ?? []) {
              if (input[name] === undefined) throw new Error(`Missing argument: ${name}`);
            }
            const url = new URL(
              tool.path,
              typeof location === "undefined" ? "http://localhost" : location.href,
            );
            const body: Record<string, unknown> = {};
            for (const [name, value] of Object.entries(input)) {
              if (tool.queryNames.includes(name)) {
                if (value !== undefined && value !== null)
                  url.searchParams.set(name, String(value));
              } else {
                body[name] = value;
              }
            }
            const response = await transport(url.href, {
              method: tool.method,
              credentials: "same-origin",
              headers: {
                accept: "application/json",
                "content-type": "application/json",
                // Desktop ControlCenter must see an agent, rather than a human IPC write.
                "x-lisca-agent": "WebMCP agent",
              },
              body: tool.method === "GET" ? undefined : JSON.stringify(body),
              signal: AbortSignal.any([signal, controller.signal]),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            const text = await response.text();
            return text ? JSON.parse(text) : null;
          },
        },
        { signal: controller.signal },
      );
    }
  } catch (cause) {
    controller.abort();
    throw cause;
  }
  return () => controller.abort();
}
