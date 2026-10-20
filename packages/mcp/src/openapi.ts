import { existsSync, readFileSync } from "node:fs";
import type { ProductId } from "./config.ts";
import { productsForOperation } from "./routing.ts";

export type JsonSchema = Record<string, unknown>;

export interface OpenApiDocument {
  paths: Record<string, Record<string, OpenApiOperationRaw>>;
  components?: { schemas?: Record<string, JsonSchema> };
}

interface OpenApiOperationRaw {
  operationId?: string;
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: OpenApiParameterRaw[];
  requestBody?: OpenApiRequestBodyRaw;
}

interface OpenApiParameterRaw {
  name: string;
  in: string;
  required?: boolean;
  schema?: JsonSchema;
}

interface OpenApiRequestBodyRaw {
  content?: Record<string, { schema?: JsonSchema }>;
}

/**
 * One HttpApi operation turned into an MCP tool definition. `queryNames` holds
 * the declared HTTP query parameters; everything else in `inputSchema` goes into
 * the request body.
 */
export interface ContractTool {
  /** MCP tool name, derived from the operationId (`align.scanSource` → `align_scan_source`). */
  name: string;
  operationId: string;
  method: string;
  path: string;
  group: string;
  products: ProductId[];
  inputSchema: {
    type: "object";
    properties: Record<string, JsonSchema>;
    required?: string[];
  };
  queryNames: string[];
}

export function loadOpenApiDocument(openApiJsonPath: string): OpenApiDocument {
  if (!existsSync(openApiJsonPath)) {
    throw new Error(
      `OpenAPI document not found at ${openApiJsonPath}. Point LISCA_MCP_OPENAPI at ` +
        `packages/contracts/openapi.json, or regenerate it with ` +
        `pnpm --filter @lisca/contracts generate.`,
    );
  }
  return JSON.parse(readFileSync(openApiJsonPath, "utf8")) as OpenApiDocument;
}

/**
 * Resolve `$ref` links, merge `allOf` members into their parent, and return a
 * self-contained schema. Cycles collapse to `{}` — none exist in the generated
 * contract today, but the guard keeps malformed future input from hanging.
 */
export function normalizeSchema(
  node: unknown,
  doc: OpenApiDocument,
  seen: Set<string> = new Set(),
): JsonSchema {
  if (Array.isArray(node)) {
    return node.map((item) => normalizeSchema(item, doc, seen)) as unknown as JsonSchema;
  }
  if (typeof node !== "object" || node === null) {
    return (node ?? {}) as JsonSchema;
  }
  const schema = { ...node } as JsonSchema;
  const ref = schema.$ref;
  if (typeof ref === "string") {
    delete schema.$ref;
    if (seen.has(ref)) {
      return {};
    }
    const target = resolveRef(ref, doc);
    if (!target) {
      return {};
    }
    return normalizeSchema(target, doc, new Set([...seen, ref]));
  }
  if (Array.isArray(schema.allOf)) {
    const members = schema.allOf;
    delete schema.allOf;
    for (const member of members) {
      const normalized = normalizeSchema(member, doc, seen);
      for (const [key, value] of Object.entries(normalized)) {
        schema[key] = value;
      }
    }
  }
  for (const key of [
    "anyOf",
    "oneOf",
    "not",
    "items",
    "prefixItems",
    "additionalProperties",
  ] as const) {
    const value = schema[key];
    if (value !== null && typeof value === "object") {
      schema[key] = normalizeSchema(value, doc, seen);
    }
  }
  if (schema.properties && typeof schema.properties === "object") {
    const properties: Record<string, JsonSchema> = {};
    for (const [name, child] of Object.entries(schema.properties)) {
      properties[name] = normalizeSchema(child, doc, seen);
    }
    schema.properties = properties;
  }
  return schema;
}

function resolveRef(ref: string, doc: OpenApiDocument): JsonSchema | undefined {
  if (!ref.startsWith("#/components/schemas/")) {
    return undefined;
  }
  return doc.components?.schemas?.[ref.slice("#/components/schemas/".length)];
}

/** Build one MCP tool definition per HttpApi operation in the OpenAPI document. */
export function contractTools(doc: OpenApiDocument): ContractTool[] {
  const tools: ContractTool[] = [];
  for (const [path, operations] of Object.entries(doc.paths)) {
    for (const [method, raw] of Object.entries(operations)) {
      if (!raw.operationId || method === "parameters") {
        continue;
      }
      const tool = contractTool(raw, method.toUpperCase(), path, doc);
      if (tool) {
        tools.push(tool);
      }
    }
  }
  tools.sort((a, b) => a.name.localeCompare(b.name));
  const names = new Set<string>();
  for (const tool of tools) {
    if (names.has(tool.name)) {
      throw new Error(`Duplicate MCP tool name ${tool.name} (operationId ${tool.operationId})`);
    }
    names.add(tool.name);
  }
  return tools;
}

/** MCP tool name for an HttpApi operationId: dots become underscores and
 * camelCase becomes snake_case (`align.cancelCropRoi` → `align_cancel_crop_roi`). */
export function toolName(operationId: string): string {
  return operationId
    .split(".")
    .map((part) => part.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase())
    .join("_");
}

function contractTool(
  raw: OpenApiOperationRaw,
  method: string,
  path: string,
  doc: OpenApiDocument,
): ContractTool | undefined {
  const operationId = raw.operationId;
  if (!operationId) {
    return undefined;
  }
  const group = raw.tags?.[0] ?? operationId.split(".")[0];
  const queryNames: string[] = [];
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const parameter of raw.parameters ?? []) {
    if (parameter.in !== "query") {
      continue;
    }
    queryNames.push(parameter.name);
    properties[parameter.name] = parameter.schema
      ? normalizeSchema(parameter.schema, doc)
      : { type: "string" };
    if (parameter.required) {
      required.push(parameter.name);
    }
  }
  const bodySchema = raw.requestBody?.content?.["application/json"]?.schema;
  if (bodySchema) {
    const normalized = normalizeSchema(bodySchema, doc);
    for (const [name, child] of Object.entries(
      (normalized.properties ?? {}) as Record<string, JsonSchema>,
    )) {
      properties[name] = child;
    }
    for (const name of (normalized.required ?? []) as string[]) {
      if (!required.includes(name)) {
        required.push(name);
      }
    }
  }
  const products = productsForOperation(operationId);
  if (products.length > 1) {
    properties.product = {
      type: "string",
      enum: products,
      default: "studio",
      description: `Which product server to call. "studio" (default) serves everything; "aligner" and "annotator" serve their own flows.`,
    };
  }
  const inputSchema: ContractTool["inputSchema"] = {
    type: "object",
    properties,
  };
  if (required.length > 0) {
    inputSchema.required = required;
  }
  return {
    name: toolName(operationId),
    operationId,
    method,
    path,
    group,
    products,
    inputSchema,
    queryNames,
  };
}
