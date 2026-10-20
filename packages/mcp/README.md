# @lisca/mcp

Local MCP server for the whole LiSCA lineup — Aligner, Annotator, and Studio. An
MCP host (Claude Code, Claude Desktop, Cline, …) connects to `lisca-mcp` and can
then drive the products end to end:

- **Contract tools** — every operation in the JSON API (`packages/contracts/openapi.json`) becomes one MCP tool: `align_scan_source`, `annotate_smart_segment`, `studio_start_analysis`, `fs_list_directory`, `tasks_list_tasks`, …
- **Server lifecycle** — `server_status` / `server_start` / `server_stop` boot the Rust product servers for a local checkout.
- **CLIs** — `cli_analyze`, `cli_crop`, and `cli_fixture_workspace` run `lisca-analyze`, `lisca-crop`, and the fixture materializer.
- **Workspace reads** — `workspace_overview`, `workspace_read_file`, `workspace_read_plot` introspect a workspace on disk (assay.json, bbox, ROI crops, annotations, analysis CSVs, result figures).
- **Waits** — `task_wait`, `analysis_wait`, `crop_wait` poll long-running jobs until they finish.

Frames and annotation masks come back as viewable PNG blocks next to their JSON
summaries, so an agent can actually _look_ at a Position before annotating it.

Requires Node.js ≥ 24. Sources run directly through native type stripping —
there is no build step.

## Run

```sh
pnpm --filter @lisca/mcp mcp            # stdio transport, for local MCP hosts
node packages/mcp/src/main.ts           # same thing without pnpm
```

Stdio hosts spawn it directly, e.g. Claude Code:

```sh
claude mcp add lisca -- node /abs/path/to/packages/mcp/src/main.ts
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "lisca": { "command": "node", "args": ["/abs/path/to/packages/mcp/src/main.ts"] }
  }
}
```

## How routing works

Studio's router is the superset (`fs` + `align` + `crop` + `annotate` + `tasks` +
`profile` + `memory` + `studio`). Tools served by more than one product carry a
`product` selector that **defaults to `studio`** — so one running Studio server
is enough for almost everything. Point the selector at `aligner` or `annotator`
when you are exercising those apps specifically. `server_status` tells you what
is up.

## Where lisca-mcp sits relative to the apps

Nowhere inside them. The apps never launch lisca-mcp and know nothing about
it — it is a _fourth process_, owned by the MCP host (Claude Code and friends
spawn it over stdio; a container entrypoint runs it in HTTP mode). It is a
second client of the same JSON API the web UI is (ADR-0002 keeps the Rust
backend transport-neutral), which is why the whole toolset works without a
single change to any Rust crate.

The two product shells differ in how that API is reached, and it matters:

```
Dev / hosted / container
  MCP host ──stdio──▶ lisca-mcp ──HTTP──▶ *-server :197xx ◀──fetch── web UI

Packaged desktop (Tauri)
  Claude Code ──stdio──▶ lisca-mcp ──HTTP──▶ ✗ no listener
  webview ──Tauri IPC (lisca_request)──▶ router embedded in the Tauri process
```

- **Dev and hosted builds** run the standalone `*-server` binary
  (`http::run_server`, port 19765/19766/19767) — a real TCP listener lisca-mcp
  calls like any other HTTP client.
- **Packaged desktop builds** embed the very same Axum router in the Tauri
  process (`IpcBackend`) and dispatch webview requests through the
  `lisca_request` Tauri command. Per ADR-0002, desktop bundles open no backend
  TCP port at all — so lisca-mcp cannot reach a running desktop app, and no
  amount of spawning changes that.

Practical consequence: when only a packaged Studio/Aligner/Annotator desktop
app is running, the contract tools have nothing to talk to. The CLI and
workspace tools still work (they touch the disk, not the app), and
`server_start` fixes the rest by booting the standalone server binary — which
runs the identical `*_server::app()` router factory the desktop app embeds.
Agent and user see the same handlers over the same workspace files; the one
divergence is in-memory state (task progress in the spawned server is not the
desktop app's), because they are two processes.

If you ever want the desktop app to own the MCP server (a Settings toggle that
exposes the app to agents and shuts down with it), two changes are required:
a loopback listener for the embedded router in `crates/lisca-tauri` — which
reverses an ADR-0002 consequence and needs its own ADR, token, and
default-off gating — plus a bundled Node runtime for packaged installs.
Until then, host-owned lisca-mcp plus `server_start` is the intended shape.

## Environment variables

| Variable                   | Meaning                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `LISCA_MCP_HOST`           | Hostname where the product servers are reachable (default `127.0.0.1`).               |
| `LISCA_MCP_<PRODUCT>_PORT` | Port per product (`ALIGNER`/`ANNOTATOR`/`STUDIO`; defaults 19765/19766/19767).        |
| `LISCA_MCP_<PRODUCT>_URL`  | Full base URL per product — overrides host and port.                                  |
| `LISCA_MCP_PROFILE_TOKEN`  | Bearer token sent with every product API call (profile and memory routes need one).   |
| `LISCA_MCP_TIMEOUT_MS`     | Per-call HTTP timeout (default 120 000; Smart tools load ONNX models).                |
| `LISCA_MCP_OPENAPI`        | Alternative path to the OpenAPI catalog (default: `packages/contracts/openapi.json`). |
| `LISCA_MCP_REPO_ROOT`      | Monorepo root override, used to locate cargo targets and the fixture script.          |
| `LISCA_MCP_HTTP_PORT`      | Set to serve MCP over Streamable HTTP instead of stdio (remote mode).                 |
| `LISCA_MCP_HTTP_HOST`      | Bind interface for remote mode (default `127.0.0.1`; containers use `0.0.0.0`).       |
| `LISCA_MCP_HTTP_PATH`      | Endpoint path (default `/mcp`).                                                       |
| `LISCA_MCP_HTTP_TOKEN`     | Bearer token required for every remote-mode request.                                  |

Self-signed TLS in front of the product servers? `NODE_TLS_REJECT_UNAUTHORIZED=0`
is the documented Node escape hatch — prefer real certificates where you can.

## Remote deployments (Docker, lab hosts)

stdio assumes the MCP host can spawn a process next to the checkout. When the
product runs elsewhere, pick one of these patterns:

### 1. lisca-mcp inside the product container (recommended)

Bake `@lisca/mcp` into the image, run the product servers as the container
entrypoint, and expose the MCP endpoint:

```dockerfile
# after building the product servers
ENV LISCA_MCP_HTTP_PORT=3100 LISCA_MCP_HTTP_HOST=0.0.0.0 LISCA_MCP_HTTP_TOKEN=…
CMD ["node", "packages/mcp/src/main.ts"]
```

Then point any MCP host at `http://<host>:3100/mcp`
(`claude mcp add --transport http lisca http://host:3100/mcp --header
"Authorization: Bearer …"`). Remote mode is stateless Streamable HTTP: several
agents can share one endpoint. Set `LISCA_MCP_HTTP_TOKEN` — anything bound off
loopback should not be anonymous. Everything works in this mode, including the
CLI tools and workspace reads, because paths are container-local.

A stdio host can also reach it without HTTP mode:
`docker exec -i <container> node packages/mcp/src/main.ts`.

### 2. lisca-mcp on the agent machine, product remote

Set `LISCA_MCP_HOST=<remote>` (or per-product `LISCA_MCP_<PRODUCT>_URL`), plus
`LISCA_MCP_PROFILE_TOKEN` if the deployment requires auth. What still works:

| Works remotely                                                                 | Why                                                             |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| All contract tools (`align_*`, `annotate_*`, `studio_*`, `fs_*`, `tasks_*`, …) | Plain HTTP against the remote servers.                          |
| `server_status`                                                                | Probes the remote URLs and reports them as `remote: true`.      |
| `task_wait`, `analysis_wait`, `crop_wait`                                      | Poll remote routes.                                             |
| `cli_*`, `workspace_*`                                                         | Only with the workspace volume mounted — they read local paths. |

What refuses, on purpose:

| Refused remotely                                | Instead                                                                                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `server_start` / `server_stop`                  | They manage _local_ binaries; a target that is not loopback is left to its own deployment tooling. The error says which env var to clear. |
| Viewing `results/*.png` through the product API | The `fs` routes are text-only (`readTextFile`); `workspace_read_plot` needs the volume mounted, or run pattern 1.                         |

`server_status` annotates remote targets so agents do not have to guess.

## Development

```sh
pnpm --filter @lisca/mcp typecheck
pnpm --filter @lisca/mcp test
```

- Tool catalog is derived from `packages/contracts/openapi.json` at startup —
  after a contract change, regenerate it
  (`pnpm --filter @lisca/contracts generate`) and new routes appear as tools.
- Sources must stay erasable-TypeScript (no parameter properties, enums, or
  namespaces): Node's strip-only mode runs them directly.
- Tests cover the catalog, routing, frame/mask rendering, CSV/JSON reads, the
  CLI wrappers (including a real `pnpm run fixture:workspace` run), server
  lifecycle guards, and both transports (stdio over an in-memory link, remote
  mode over real HTTP).
