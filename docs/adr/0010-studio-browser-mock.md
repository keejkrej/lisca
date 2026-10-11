# ADR-0010: Studio browser mock opens the real web app on a fixture workspace

- **Status:** accepted
- **Date:** 2026-10-11

## Decision

`pnpm run dev:studio-mock` is a mode of the real Studio web app. It materializes
an `@lisca/fixtures` workspace, starts `studio-server` on port 19777, and starts
`@lisca/studio-web` with Vite `--mode mock` on port 18777. That mode loads
`.env.mock` (`VITE_LISCA_MOCK=1`) and opens the fixture `assay.json` on
Metadata once the server can read it. `pnpm run dev:studio` does not load a
fixture.

The removed demo packages, instrument mock, landing site, and `@lisca/web-demo`
stay removed. This mode does not add a second UI, a fake HTTP client, or a
presentation build.

## Why

Studio's web UI is blank until an assay is open, and opening one needs a
workspace the server can read. A separate demo app was the previous way to look
at the UI, and it drifted from Studio. The browser mock keeps the real routes,
the real client, and the real server, and only changes the workspace you land
on. Vite's mock mode is build-time, so production and desktop builds never see
the flag.

Rejected alternatives:

- Revive `apps/mock`, `apps/*/demo`, or `@lisca/web-demo`. Those were separate
  products and were removed on purpose.
- Seed `dev:studio`. A normal dev session should open the workspace you choose,
  not a sample.
- Replace the HTTP client with in-browser fixtures. The UI would no longer be
  the one that talks to the server, and frame, scan, and file behavior would
  have a second implementation.

## Looks like a bug when

- `dev:studio` on port 18767 opens `.mock/studio` by itself. It should not.
- The mock UI is a different package or a copied page tree. It is `@lisca/studio-web`.
- A production or desktop build opens a fixture assay on startup. Only Vite
  `--mode mock` sets `VITE_LISCA_MOCK`.
- The source stage is offered as a mock workspace. It is an image folder and
  has no `assay.json`.
