# AGENTS.md

## Concept

software stack for experimental platform 'live-cell imaging on single cell arrays'

## Client state

- **Effect Atom** (`@effect-atom/atom-react`) for all reactive client state: server queries, mutations, UI session, and wizard drafts.
- **`@lisca/client` ports** remain the IO boundary (`ClientEffect`); atoms call ports via `Atom.runtime` + port layers.
- Wrap apps with `RegistryProvider` (see each app's `*-atoms-provider.tsx`).
- Patterns and conventions: [`packages/client/src/atoms/README.md`](packages/client/src/atoms/README.md).

## Cross-language contracts

- **Effect Schema + HttpApi** in `@lisca/contracts` is the single source of truth for every wire and on-disk type (TS *and* Rust).
- TS wire types are **derived** from the schemas (`typeof XSchema.Type`); never hand-write them.
- Generation pipeline (`bun run --cwd packages/contracts generate`, then `… rust-types`): Effect HttpApi → `openapi.json` (`OpenApi.fromApi`) + `contract.schema.json` → Rust `serde` types via `typify` into `crates/lisca/src/protocol/generated.rs` (re-exported from `protocol/mod.rs`).
- `AlignerSource` is the only hand-written Rust type (internally-tagged enum); the contract points `typify` at it via the `x-rust-type` extension.
- Numeric precision (`u32`/`i32`/`f64`) is pinned with JSON Schema `format` annotations in the schemas.
- Details: [`packages/contracts/README.md`](packages/contracts/README.md).

## Reference for UI and design pattern

- https://github.com/pingdotgg/t3code or ../t3code local clone
