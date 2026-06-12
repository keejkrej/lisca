# Mobile clients (Expo / React Native)

Mobile apps under `apps/*/mobile` are native clients for the external Rust servers — they do not bundle the server.

## Stack

- **Expo SDK 54** + **Expo Router** file routes
- **@lisca/mobile-app** — provider stack + `createLiscaMobilePort`
- **@lisca/ui-native** — shell, modals, Skia canvas (`AlignCanvas`, `AnnotationCanvas`); see [ui-package-layout.md](./ui-package-layout.md) for folder conventions
- **@lisca/client** + Effect Atom — same ports/atoms as web
- **@lisca/storage** — AsyncStorage on native, `localStorage`/`sessionStorage` on web

## Environment

| Variable                     | Purpose                            |
| ---------------------------- | ---------------------------------- |
| `EXPO_PUBLIC_LISCA_HTTP_URL` | Full HTTP base override            |
| `EXPO_PUBLIC_LISCA_WS_URL`   | Full WebSocket URL override        |
| `EXPO_PUBLIC_LISCA_WS_HOST`  | LAN host for dev (e.g. machine IP) |
| `EXPO_PUBLIC_LISCA_WS_PORT`  | Server port when using host/port   |

On a physical device, point at your machine: `EXPO_PUBLIC_LISCA_WS_HOST=192.168.x.x`.

## Dev

```bash
bun lisca dev aligner mobile     # Expo web — http://localhost:8081
bun lisca dev annotator mobile   # http://localhost:8082
bun lisca dev studio mobile      # http://localhost:8083
```

Mobile dev runs **Expo in the browser** (not via turbo). Open the **808x** URL — the CLI starts a dev proxy there that forwards API routes (`/ws`, `/fs`, `/align`, …) to Rust on **876x** and everything else to Expo on **908x** (808x + 1000). Same-origin resolution works like the Vite web apps.

First load may take a few seconds while CanvasKit (Skia WASM) initializes.

For the production Vite web UI, use `bun lisca dev aligner web` → http://localhost:8765.

Use `bun lisca dev aligner server` for Rust only. Override the API target in the app shell or via `EXPO_PUBLIC_LISCA_*` when pointing at a remote host.

Each app uses a fixed Metro port so all three can run in parallel.

Monorepo Metro config: `scripts/metro-monorepo.cjs` (resolved from each app's `metro.config.js`). Requires `babel-preset-expo` and expo-router peers (`@expo/metro-runtime`, `expo-constants`, `expo-linking`) in the mobile app package.

## Storage bootstrap

Each app wraps the tree in `StorageBootstrap` (hydrates AsyncStorage into `@lisca/storage`) before atoms read session state.

## Server connection

`ShellServerProvider` in `@lisca/ui-native` mirrors web: saved servers, active address, WS probe, settings dialog.

## Canvas

Imaging uses `@shopify/react-native-skia`. Grid math and contrast live in `@lisca/utils`; pixel prep in `@lisca/ui-native/features/canvas/frame-pixels.ts`.

## Studio results

Plot parsing lives in `@lisca/analysis`. Native charts use `react-native-svg`; PDF export uses `buildResultPdfFromCaptures` + `studioClient.saveResultPdf`.
