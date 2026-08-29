# Hosted builds use HTTP; desktop builds use in-process Tauri IPC

The Rust backend is transport-neutral. Each product server crate exports an `app()` Axum router that
is mounted in one of two shells:

- Hosted web: the standalone `*-server` binary serves the router over HTTP.
- Tauri desktop: the desktop binary links the server crate, keeps the router in-process, and dispatches
  frontend requests through the `lisca_request` Tauri command.

The generated TypeScript API client selects the Tauri bridge when `window.liscaDesktop` exists and
otherwise uses its normal Fetch/HTTP transport. Desktop file assets used by image elements are loaded
through the same bridge and converted to data URLs.

## Consequences

- Desktop bundles contain no server executable and open no backend TCP port.
- Hosted and desktop products execute the same Rust handlers and state implementations.
- HTTP-specific concerns stay in the standalone server shell; Tauri-specific concerns stay in
  `crates/lisca-tauri` and `packages/client/src/infra/desktop.ts`.
- Adding another frontend host does not require duplicating backend behavior; it only needs a transport
  adapter for the shared router contract.
