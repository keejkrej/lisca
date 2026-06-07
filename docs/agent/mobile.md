# Mobile clients (Expo / React Native)

Mobile apps under `apps/*/mobile` are native clients for the external Rust servers — they do not bundle the server.

## Stack

- **Expo SDK 54** + **Expo Router** file routes
- **@lisca/mobile-app** — provider stack + `createLiscaMobilePort`
- **@lisca/ui-native** — shell, modals, Skia canvas (`AlignCanvas`, `AnnotationCanvas`)
- **@lisca/client** + Effect Atom — same ports/atoms as web
- **@lisca/storage** — AsyncStorage on native, `localStorage`/`sessionStorage` on web

## Environment

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_LISCA_HTTP_URL` | Full HTTP base override |
| `EXPO_PUBLIC_LISCA_WS_URL` | Full WebSocket URL override |
| `EXPO_PUBLIC_LISCA_WS_HOST` | LAN host for dev (e.g. machine IP) |
| `EXPO_PUBLIC_LISCA_WS_PORT` | Server port when using host/port |

On a physical device, point at your machine: `EXPO_PUBLIC_LISCA_WS_HOST=192.168.x.x`.

## Dev

```bash
bun lisca dev aligner mobile        # Expo CLI (i/a/w keys work) — Metro :8081
bun lisca dev aligner mobile-web    # same app in the browser — http://localhost:8081
bun lisca dev annotator mobile      # Metro :8082
bun lisca dev annotator mobile-web  # http://localhost:8082
bun lisca dev studio mobile         # Metro :8083
bun lisca dev studio mobile-web     # http://localhost:8083
```

Mobile dev runs **Expo directly** (not through turbo) so keyboard shortcuts work. Turbo still builds workspace dependencies first.

For production UI parity in a browser, use the Vite web apps (`bun lisca dev aligner web` → http://localhost:5173). `mobile-web` loads CanvasKit (Skia WASM) before Expo Router starts; the first load may take a few seconds.

Connect to a running Rust server (`bun lisca dev aligner server`) or set server address in the app shell — otherwise the WebSocket probe to port 8765 will fail (expected).

Each app uses a fixed Metro port so all three can run in parallel.

Monorepo Metro config: `scripts/metro-monorepo.cjs` (resolved from each app's `metro.config.js`). Requires `babel-preset-expo` and expo-router peers (`@expo/metro-runtime`, `expo-constants`, `expo-linking`) in the mobile app package.

## Storage bootstrap

Each app wraps the tree in `StorageBootstrap` (hydrates AsyncStorage into `@lisca/storage`) before atoms read session state.

## Server connection

`ShellServerProvider` in `@lisca/ui-native` mirrors web: saved servers, active address, WS probe, settings dialog.

## Canvas

Imaging uses `@shopify/react-native-skia`. Grid math and contrast live in `@lisca/utils`; pixel prep in `@lisca/ui-native/features/canvas/frame-pixels.ts`.

## Studio results

Plot parsing lives in `@lisca/studio-result`. Native charts use `react-native-svg`; PDF export uses `buildResultPdfFromCaptures` + `studioClient.saveResultPdf`.
