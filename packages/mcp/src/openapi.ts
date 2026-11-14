import { existsSync, readFileSync } from "node:fs";
import type { OpenApiDocument } from "@lisca/contracts/agent-tools";
export * from "@lisca/contracts/agent-tools";

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
