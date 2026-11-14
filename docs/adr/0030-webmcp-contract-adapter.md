# ADR-0030: WebMCP shares the product contract and transport

- **Status:** accepted
- **Date:** 2026-11-14

## Decision

Expose product-scoped contract operations through optional `document.modelContext` tools in the shared web app bootstrap, using same-origin HTTP on hosted apps and the existing IPC bridge on desktop.

## Why

A separate browser automation implementation would drift from desktop MCP and the product API. The browser-safe catalog builder and product routing live in `@lisca/contracts` and are reused by the Node MCP server. Native desktop MCP continues to consume the same OpenAPI document in Rust. Browser registration uses abort signals for disposal and does not install a polyfill or open a new listener.

Desktop WebMCP calls carry the same agent marker as native MCP so they pass through workspace control. Hosted servers retain their existing HTTP authorization and concurrency behavior; this adapter does not add desktop's ControlCenter to hosted deployments. Tool operations act on backend state and persisted workspace files; they do not update unsaved canvas edits or navigate the UI. Native-only tools, local CLI processes, and server management are not browser tools.

## Looks like a bug when

- An unsupported browser has no WebMCP tools but LiSCA works normally.
- Aligner does not advertise Studio crop or annotation operations.
- A saved workspace change needs a view reload, as with desktop MCP.
- Hosted WebMCP does not show desktop's pause/takeover banner.
