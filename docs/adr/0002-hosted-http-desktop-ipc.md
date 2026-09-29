# Hosted builds use HTTP; desktop builds use in-process Tauri IPC

The Rust backend is transport-neutral. Each product server crate exports an `app()` Axum router that
is mounted in one of two shells:

- Hosted web: the standalone `*-server` binary serves the router over HTTP, on the same origin as
  the web app (ADR-0003).
- Tauri desktop: the desktop binary links the server crate, keeps the router in-process, and dispatches
  frontend requests through the `lisca_request` Tauri command.

The generated TypeScript API client selects the Tauri bridge when `window.liscaDesktop` exists and
otherwise uses its normal Fetch/HTTP transport. Desktop file assets used by image elements are loaded
through the same bridge and converted to data URLs.

`GET /fs/file` stays outside that JSON contract. The handler returns the file bytes with a content
type. Web builds request the origin-relative URL. Desktop builds send the same URL through
`lisca_request` and turn a non-UTF-8 body into a data URL, because an image element cannot call the
in-process router. Text reads use `GET /fs/read-text`, which returns `{ contents: string }`. Typing
`/fs/file` as that JSON object described a response the handler does not send, and no caller used the
generated method.

## Consequences

- Desktop bundles contain no server executable and open no backend TCP port.
- Hosted and desktop products execute the same Rust handlers and state implementations.
- HTTP-specific concerns stay in the standalone server shell; Tauri-specific concerns stay in
  `crates/lisca-tauri` and `packages/client/src/infra/desktop.ts`.
- Adding another frontend host does not require duplicating backend behavior; it only needs a transport
  adapter for the shared router contract.
- `GET /fs/file` is served by the shared router and is absent from the Effect `HttpApi` and
  `openapi.json`. `scripts/check-openapi-routes.ts` allows that one Rust path.

## Looks like a bug when

- "OpenAPI is missing `GET /fs/file`" — intended. The route returns raw bytes. Plots load it by URL
  (`resultFileUrl`), and the desktop shell adapts that response in `resolveLiscaAssetUrl`.
- "The generated client has no `readFile`" — intended. Text contents go through `readTextFile`.
