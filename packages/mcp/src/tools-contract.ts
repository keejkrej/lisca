import { isProductId, type ProductId } from "./config.ts";
import { frameContent, maskContent } from "./content.ts";
import { callProductApi } from "./http.ts";
import { operationDescription } from "./descriptions.ts";
import type { ContrastWindow, FramePixels } from "./images.ts";
import { isFramePayloadOperation, isMaskPayloadOperation } from "./routing.ts";
import type { ContractTool } from "./openapi.ts";
import type { LiscaTool } from "./tool.ts";
import { errorFrom, jsonResult } from "./tool.ts";

/** Base64 fields rendered as viewable images next to the JSON summary. */
const MASK_FIELD = "maskBase64Png";

/**
 * Turn the HttpApi contract into MCP tools. Tool input schema = the operation's
 * query parameters + request body, plus a `product` selector when more than
 * one product server serves the route.
 */
export function contractLiscaTools(toolDefs: ContractTool[]): LiscaTool[] {
  return toolDefs.map((toolDef) => ({
    name: toolDef.name,
    title: toolDef.operationId,
    description: operationDescription(
      toolDef.operationId,
      toolDef.method,
      toolDef.path,
      toolDef.products,
    ),
    inputSchema: toolDef.inputSchema,
    handler: async (args) => {
      try {
        const product = resolveProduct(toolDef, args.product);
        const { product: _selector, ...rest } = args;
        const query = pick(rest, toolDef.queryNames);
        const body = toolDef.method === "GET" ? undefined : omit(rest, toolDef.queryNames);
        const result = await callProductApi(product, toolDef.method, toolDef.path, { query, body });
        return contractResult(toolDef, body, result);
      } catch (cause) {
        return errorFrom(cause);
      }
    },
  }));
}

function resolveProduct(toolDef: ContractTool, requested: unknown): ProductId {
  if (requested === undefined || requested === null || requested === "") {
    // Multi-product routes default to studio: its router is the superset, so a
    // single running Studio serves every operation the agent might call.
    return toolDef.products.includes("studio") && toolDef.products.length > 1
      ? "studio"
      : (toolDef.products[0] ?? "studio");
  }
  if (!isProductId(requested) || !toolDef.products.includes(requested)) {
    return throwProductMismatch(toolDef, requested);
  }
  return requested;
}

function throwProductMismatch(toolDef: ContractTool, requested: unknown): never {
  throw new Error(
    `${toolDef.operationId} is served by ${joinProducts(toolDef.products)}, not ${JSON.stringify(requested)}. ` +
      `Call server_status to see which servers are running.`,
  );
}

function joinProducts(products: ProductId[]): string {
  if (products.length <= 1) {
    return products.join("");
  }
  return `${products.slice(0, -1).join(", ")} or ${products[products.length - 1]}`;
}

function contractResult(toolDef: ContractTool, requestBody: unknown, result: unknown) {
  if (isFramePayloadOperation(toolDef.operationId) && isFrameResult(result)) {
    const contrast = (requestBody as { contrast?: ContrastWindow | null } | undefined)?.contrast;
    const { content } = frameContent(result, contrast);
    return { content };
  }
  if (isMaskPayloadOperation(toolDef.operationId) && result && typeof result === "object") {
    const { content } = maskContent(result as Record<string, unknown>, MASK_FIELD);
    return { content };
  }
  return jsonResult(result);
}

function isFrameResult(value: unknown): value is FramePixels & Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.dataBase64 === "string" &&
    typeof record.width === "number" &&
    typeof record.height === "number" &&
    typeof record.pixelType === "string"
  );
}

function pick(source: Record<string, unknown>, names: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of names) {
    if (source[name] !== undefined) {
      out[name] = source[name];
    }
  }
  return out;
}

function omit(source: Record<string, unknown>, names: string[]): Record<string, unknown> {
  const drop = new Set(names);
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(source)) {
    if (!drop.has(name)) {
      out[name] = value;
    }
  }
  return out;
}
