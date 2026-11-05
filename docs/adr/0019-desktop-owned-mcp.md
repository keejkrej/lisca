# ADR-0019: Desktop apps own their local MCP server

- **Status:** accepted
- **Date:** 2026-11-05

## Decision

Packaged Studio, Aligner, and Annotator expose MCP themselves. **Settings →
Agents** enables a loopback-only, bearer-token-protected Streamable HTTP
endpoint served from the Tauri process. Studio defaults to
`http://127.0.0.1:19770/mcp`; Aligner and Annotator use 19768 and 19769. The
settings panel shows the URL and a ready-to-paste `claude mcp add` command.

The endpoint dispatches contract tools to the same embedded Axum router used by
`lisca_request`. It is implemented in Rust in `crates/lisca-tauri`; no Node
runtime, source checkout, package manager, or standalone product server is
required.

This amends the "desktop bundles open no backend TCP port" consequence of
[ADR-0002](0002-hosted-http-desktop-ipc.md): desktop still opens no general
backend API port, but it may open the explicitly enabled MCP-only port.

## Why

The host-owned `@lisca/mcp` Node process is a good development and hosted-server
tool, but it makes an end user's install unusable by Claude Code unless the user
also has the monorepo and Node.js. It also starts a second backend, so its task
progress and in-memory inference settings are not the desktop app's state.

Keeping MCP inside the app gives one source of truth. A crop started by an agent
is the same task the user sees in Studio, and the provider selected in Settings
is the provider subsequent MCP inference calls use.

## Consequences

- The listener is **off by default** and binds only `127.0.0.1`. Enabling it
  writes `mcp.json` in the app config directory with the port and a generated
  bearer token. Every MCP request requires that token.
- The native catalog is generated from the OpenAPI document embedded at compile
  time, filtered to the routes mounted by the current product. Native tools add
  `cli_align` (the canvas-free grid detector) and `server_status`; long-running
  work goes through the existing crop, analysis, and task routes.
- Frame and mask payloads are returned as MCP image blocks. The desktop renders
  the product's already display-mapped 8-bit pixels directly instead of applying
  their 16-bit contrast window a second time.
- MCP automates backend actions, not pixels. It does not navigate the webview or
  synthesize clicks; the user inspects saved workspace changes in the same app.
  Views that do not subscribe to filesystem changes may need a reload.
- `@lisca/mcp` remains useful for source checkouts, hosted deployments, and
  containers. It is no longer the recommended path for packaged desktop users.

## Looks like a bug when

- A packaged install asks the user to install Node.js or start `*-server` before
  Claude Code can use it.
- MCP starts automatically without the user's opt-in, binds a non-loopback
  interface, or accepts requests without the bearer token.
- Agent-started work appears in a second task scheduler instead of the running
  app's task center.
- The desktop spawns the TypeScript MCP server or a second copy of the backend.
