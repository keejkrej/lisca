# ADR-0003: Web builds are same-origin only; there is no remote-server mode

- **Status:** accepted
- **Date:** 2026-09-28

## Decision

We will support exactly three ways to run a product: the dev web app (Vite proxying to a locally
running server), the Docker deployment (nginx serving the web app and proxying to the server), and
the Tauri desktop app (in-process IPC, ADR-0002). The web app always calls the server on its own
origin, because pointing a web app at some other server was brittle to deploy and nobody used it.

## Why

Before this, the web client resolved its API base URL from a `?liscaHttp=` query, a persisted
"active server" / saved-server list, and `VITE_HTTP_URL`/`HOST`/`PORT` build variables, and the Rust
server sent permissive CORS headers so a page on one origin could call a server on another. Work
sessions and crop-recovery records were tagged with a server key to keep servers apart. None of this
had a UI, and a cross-origin deployment needed extra configuration nobody maintained.

Dev and Docker both already serve the web app and the API from one origin, and desktop never uses
HTTP at all. Dropping the remote mode let us delete all of it:

- API requests use origin-relative URLs (`/fs/…`, `/studio/…`); there is no base-URL resolution,
  per-app default port, or port factory in the web client.
- No CORS layer on the server.
- Work sessions and crop recovery are not partitioned by server.
- Server status is exception-only: nothing when healthy; a "Server unreachable" alert with recovery
  hints and Retry when the web app cannot reach its server; never shown in desktop builds, where
  there is no connection.

Rejected alternative: keep the remote mode behind an explicit setting. It would bring back CORS,
base-URL plumbing, and server-scoped storage for a setup no one runs; a remote server is reached by
deploying the Docker image there instead.

## Looks like a bug when

- "The web app can't talk to a Lisca server on another host or port" — intended; serve the web app
  from that server (Docker) or use the desktop app.
- "`?liscaHttp=` / `VITE_HTTP_URL` does nothing" — removed on purpose.
- "The server sends no CORS headers" — intended; every caller is same-origin or IPC.
- "There is no Connected indicator" — intended; only the unreachable state is shown.
