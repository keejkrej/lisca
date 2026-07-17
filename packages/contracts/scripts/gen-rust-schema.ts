import { OpenApi } from "@effect/platform";
import * as JSONSchema from "effect/JSONSchema";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AssayJsonFileSchema } from "../src/assay.schema";
import { liscaApi } from "../src/http-api";
import { AppIdSchema, MemoryTouchRequestSchema, RoiIndexFileSchema } from "../src/schema/index";

/**
 * Build the single JSON Schema document consumed by `typify` to generate the
 * Rust serde types. It bundles:
 *   - every HTTP wire type (from the OpenAPI components emitted by the HttpApi)
 *   - the on-disk assay.json contract (not an HTTP payload)
 *
 * Typify needs `oneOf` with inline object variants (not `anyOf` + `$ref`) to
 * emit `#[serde(tag = "kind")]` internally-tagged enums. Effect/OpenAPI emit
 * `anyOf` with `$ref` for unions — we normalize those shapes here without
 * changing the wire JSON or the Effect schema authoring.
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
function foldDefs(schema: Parameters<typeof JSONSchema.make>[0], identifier: string): void {
  const json = JSONSchema.make(schema) as { $defs?: Record<string, JsonObject> };
  if (!json.$defs?.[identifier]) {
    throw new Error(
      `gen-rust-schema: identifier-annotated schema did not emit $defs.${identifier}`,
    );
  }
  for (const [name, def] of Object.entries(json.$defs ?? {})) {
    definitions[name] = def;
  }
}

foldDefs(AssayJsonFileSchema, "AssayJsonFile");
// Server identity (not an HTTP payload; used by Rust `run_server`).
foldDefs(AppIdSchema, "AppId");
// On-disk ROI index container (not an HTTP payload).
foldDefs(RoiIndexFileSchema, "RoiIndexFile");
// HttpApi inlines top-level union payloads, so fold this union explicitly.
foldDefs(MemoryTouchRequestSchema, "MemoryTouchRequest");

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
        out.$ref = child
          .replace("#/components/schemas/", "#/definitions/")
          .replace("#/$defs/", "#/definitions/");
      } else {
        out[key] = rewriteRefs(child);
      }
    }
    return out;
  }
  return value;
}

function resolveDefinition(ref: string, schemaDefinitions: JsonObject): JsonObject {
  const name = ref.replace("#/definitions/", "");
  const schema = schemaDefinitions[name];
  if (!schema) {
    throw new Error(`gen-rust-schema: unresolved $ref ${ref}`);
  }
  return schema;
}

/** Expand `$ref` members so typify can detect a shared `kind` discriminant. */
function inlineMember(member: JsonObject, schemaDefinitions: JsonObject): JsonObject {
  if (typeof member.$ref === "string") {
    return inlineMember(resolveDefinition(member.$ref, schemaDefinitions), schemaDefinitions);
  }
  return member;
}

/**
 * typify emits flat `#[serde(tag = "kind")]` enums only for `oneOf` whose
 * members are inline objects with a required singleton `kind` string. Effect
 * emits `anyOf` + `$ref` instead — same wire JSON, different encoding.
 */
function normalizeUnionForTypify(schema: JsonObject, schemaDefinitions: JsonObject): JsonObject {
  const members = (schema.oneOf ?? schema.anyOf) as JsonObject[] | undefined;
  if (!members?.length) return schema;
  return { oneOf: members.map((member) => inlineMember(member, schemaDefinitions)) };
}

const normalized = rewriteRefs({ definitions }) as { definitions: JsonObject };

for (const name of ["AlignerSource", "MemoryTouchRequest"]) {
  const schema = normalized.definitions[name];
  if (schema) {
    normalized.definitions[name] = normalizeUnionForTypify(schema, normalized.definitions);
  }
}

// Drop OpenAPI/HttpApi-internal error envelope types that are not part of the
// Rust contract.
delete normalized.definitions.HttpApiDecodeError;
delete normalized.definitions.Issue;
delete normalized.definitions.PropertyKey;

// No root `title` — typify would otherwise emit a useless
// `LiscaContract(serde_json::Value)` wrapper for the document.
const doc = {
  $schema: "http://json-schema.org/draft-07/schema#",
  definitions: normalized.definitions,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote contract JSON Schema to ${outPath}`);
