# Copilot review instructions

LiSCA is a pnpm/Vite+ and Cargo monorepo: SolidJS web apps, Rust (Axum) servers, and Tauri
desktop shells for Studio, Aligner, and Annotator. `AGENTS.md` (symlinked as `CLAUDE.md`) holds the full repository
guidelines; `docs/adr/` records deliberate choices.

When reviewing a pull request, prioritize correctness bugs and regressions over style. Formatting
and lint are enforced by CI (`pnpm run fmt:check`, `pnpm run check`), so do not comment on them.

Flag in particular:

- Behavior that contradicts an accepted ADR in `docs/adr/` (for example: web builds must call the
  server on their own origin with relative URLs, with no base-URL override or CORS; desktop builds
  use Tauri IPC). Cite the ADR.
- `fetch` called from UI components; network access belongs in `@lisca/client`.
- Contract changes in `packages/contracts` without regenerated `openapi.json`,
  `contract.schema.json`, and `crates/lisca/src/protocol/generated.rs`.
- A new server route prefix not proxied by both the Vite dev proxy
  (`scripts/lisca-dev-ports.cjs`) and `docker/nginx.conf.template`.
- Behavior changes without a focused regression test (Vitest `*.test.ts(x)`, Rust
  `crates/<crate>/tests/`, Python `python/tests/test_*.py`).
- Desktop release manifests whose versions drift from the shared release version
  (`docs/agents/releases.md`).

Keep comments specific: name the file and line, the failing scenario, and a suggested fix.
