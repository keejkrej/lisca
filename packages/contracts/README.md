# @lisca/contracts

Single source of truth for every contract shared between the TypeScript apps and
the Rust backend(s). **Effect Schema** defines the types; **Effect HttpApi**
defines the HTTP surface. Everything else — the TypeScript wire types, the
OpenAPI document, and the Rust `serde` types — is *derived* from these.

Because the contract is backend-agnostic (OpenAPI 3.1), the Rust server can be
swapped for any other backend (Node, FastAPI, …) without touching the schema.

## Layout

| File | Role |
| --- | --- |
| `src/protocol.schema.ts` | Canonical Effect schemas for HTTP/WS wire types + derived TS types |
| `src/assay.schema.ts` | Canonical schemas for the on-disk `assay.json` contract |
| `src/http-api.ts` | Effect `HttpApi` definition (groups, endpoints, error envelope) |
| `src/decode.ts` | Schema decode helpers |
| `openapi.json` | Generated OpenAPI 3.1 spec (`OpenApi.fromApi`) |
| `contract.schema.json` | Generated JSON Schema bundle fed to `typify` |

## Generation pipeline

```
Effect Schema + HttpApi  (src/*.ts, hand-authored)
        │
        ├─ OpenApi.fromApi ─────────────▶ openapi.json        (neutral API spec)
        │
        ├─ scripts/gen-rust-schema.ts ──▶ contract.schema.json (JSON Schema bundle)
        │                                       │
        │                                       └─ typify ─▶ crates/lisca/src/protocol/generated.rs
        │
        └─ HttpApiClient.make ──────────▶ @lisca/client ports  (typed TS client)
```

Commands:

```sh
# Emit openapi.json + contract.schema.json (pure TS, no Rust toolchain needed)
bun run --cwd packages/contracts generate

# Regenerate the Rust serde types (requires `cargo install cargo-typify`)
bun run --cwd packages/contracts rust-types
```

## Conventions

- **Never hand-write a TS wire type.** Export `type X = typeof XSchema.Type`.
- Give every named schema an `identifier` so OpenAPI/typify emit clean names.
- Pin Rust numerics with JSON Schema `format` annotations: `uint32` → `u32`,
  `int32` → `i32`, `double` → `f64` (see the `U32`/`I32`/`F64` helpers).
- Discriminated unions (`AlignerSource`, etc.): Effect emits `anyOf` + `$ref`;
  `gen-rust-schema.ts` rewrites to inline `oneOf` so typify emits
  `#[serde(tag = "kind")]` enums (same wire JSON, typify-friendly encoding).
- The HTTP error envelope is `RequestError` → `{ "_tag": "RequestError",
  "message": string }` with status 400; Rust mirrors it in `http/error.rs`.

After changing a schema, run `generate` + `rust-types`, then `cargo test -p
lisca` (the `protocol::contract_tests` lock the key wire shapes).
