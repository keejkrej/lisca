import { OpenApi } from "@effect/platform";
import * as JSONSchema from "effect/JSONSchema";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AssayJsonFileSchema } from "../src/assay.schema.ts";
import { liscaApi } from "../src/http-api.ts";
import { RoiIndexFileSchema, ServerWsMessageSchema } from "../src/protocol.schema.ts";

/**
 * Build the single JSON Schema document consumed by `typify` to generate the
 * Rust serde types. It bundles:
 *   - every HTTP wire type (from the OpenAPI components emitted by the HttpApi)
 *   - the on-disk assay.json contract (not an HTTP payload)
 *   - the WebSocket server-push message union
 *
 * `AlignerSource` is a `#[serde(tag = "kind")]` enum in Rust whose ergonomics
 * typify cannot reproduce, so we hand-write it and point typify at the existing
 * type via the `x-rust-type` extension.
 */

type JsonObject = Record<string, unknown>;

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "../contract.schema.json");

const definitions: JsonObject = {};

// HTTP wire types from the OpenAPI components.
const openapi = OpenApi.fromApi(liscaApi) as unknown as {
  components: { schemas: Record<string, JsonObject> };
};
for (const [name, schema] of Object.entries(openapi.components.schemas)) {
  definitions[name] = schema;
}

// Non-HTTP contract types via JSON Schema. `JSONSchema.make` emits a `$defs`
// map plus a `$ref` root; fold the `$defs` into our definitions.
function foldDefs(schema: Parameters<typeof JSONSchema.make>[0]): void {
  const json = JSONSchema.make(schema) as { $defs?: Record<string, JsonObject> };
  for (const [name, def] of Object.entries(json.$defs ?? {})) {
    definitions[name] = def;
  }
}

foldDefs(AssayJsonFileSchema);
foldDefs(ServerWsMessageSchema);
// On-disk ROI index container (not an HTTP payload).
foldDefs(RoiIndexFileSchema);

// Normalize every `$ref` so they resolve within a single `definitions` map
// (OpenAPI uses `#/components/schemas/...`, JSONSchema.make uses `#/$defs/...`).
function rewriteRefs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(rewriteRefs);
  if (value && typeof value === "object") {
    const out: JsonObject = {};
    for (const [key, child] of Object.entries(value as JsonObject)) {
      // Drop `additionalProperties: false` so generated serde structs stay
      // lenient (matching the pre-migration behaviour of ignoring unknown
      // fields), rather than emitting `#[serde(deny_unknown_fields)]`.
      if (key === "additionalProperties" && child === false) continue;
      if (key === "$ref" && typeof child === "string") {
        out.$ref = child.replace("#/components/schemas/", "#/definitions/").replace(
          "#/$defs/",
          "#/definitions/",
        );
      } else {
        out[key] = rewriteRefs(child);
      }
    }
    return out;
  }
  return value;
}

const normalized = rewriteRefs({ definitions }) as { definitions: JsonObject };

// Point typify at the hand-written Rust enum for the tagged union.
normalized.definitions.AlignerSource = {
  "x-rust-type": {
    crate: "lisca",
    version: "*",
    path: "lisca::protocol::AlignerSource",
  },
};

// Drop OpenAPI/HttpApi-internal error envelope types that are not part of the
// Rust contract.
delete normalized.definitions.HttpApiDecodeError;
delete normalized.definitions.Issue;
delete normalized.definitions.PropertyKey;
delete normalized.definitions.RequestError;

const doc = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "LiscaContract",
  definitions: normalized.definitions,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote contract JSON Schema to ${outPath}`);
