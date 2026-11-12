# ADR-0025: Standalone Aligner and Annotator share agent control and stage-scoped MCP tools

- **Status:** accepted
- **Date:** 2026-11-12

## Decision

We will expose Settings (Updates, MCP Agents, and Inference on Annotator), the Quick Guide, and the live MCP agent control banner across Studio, Aligner, and Annotator while scoping MCP tools and backend routes to each app's stage (`cli_align` on Aligner/Studio; `/studio/label-free/*` on Annotator/Studio; crop and batch analysis on Studio/CLI), because standalone stage apps must support human-in-the-loop agent takeover and label-free classification without becoming multi-route Studio clones.

## Why

[ADR-0019](0019-desktop-owned-mcp.md) and [ADR-0020](0020-workspace-control-and-takeover.md) gave packaged Aligner and Annotator embedded MCP listeners and workspace control locks in `crates/lisca-tauri`, but only Studio mounted the Settings dialog, MCP setup UI, and live takeover banner, and Annotator still advertised `cli_align` while lacking `/studio/label-free/*` routes.

Sharing `ShellSettingsDialog`, `ShellHelpDialog`, and `ShellAgentActivity` in `@lisca/ui/shell` and `LabelFreeReferencesPanel` in `@lisca/instrument` lets users configure MCP, pause/take over/hand back an agent, and build or run label-free reference embeddings directly inside Annotator, while keeping [ADR-0001](0001-app-shapes.md) intact (Aligner and Annotator stay single-page stage apps; ROI cropping and batch analysis stay in Studio and the CLI). Note that `annotator_server::app()` mounts `/studio/label-free/*` rather than `annotator_server::router()` so `studio_server::app()` does not register duplicate routes when merging `annotator_server::router()`.

## Looks like a bug when

- Standalone Annotator serves `/studio/label-free/*` paths so it shares the OpenAPI contract and MCP tool names with Studio without duplicating endpoints.
- Standalone Aligner does not offer ROI crop or label-free tools over MCP, and standalone Annotator does not offer `cli_align`.
