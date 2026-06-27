# Mobile clients (Expo / React Native)

Mobile apps under `apps/*/mobile` are native clients for the external Rust servers — they do not bundle the server.

## Stack

- **Expo SDK 54** + **Expo Router** file routes
- **@lisca/mobile-app** — provider stack + `createLiscaMobilePort`
- **@lisca/ui-native** — shell, modals, Skia canvas (`AlignCanvas`, `AnnotationCanvas`); see [ui-package-layout.md](./ui-package-layout.md) for folder conventions
- **@lisca/client** + Effect Atom — same ports/atoms as web
- **@lisca/storage** — AsyncStorage on native, `localStorage`/`sessionStorage` on web

## Environment

| Variable                      | Purpose                            |
| ----------------------------- | ---------------------------------- |
| `EXPO_PUBLIC_LISCA_HTTP_URL`  | Full HTTP base override            |
| `EXPO_PUBLIC_LISCA_HTTP_HOST` | LAN host for dev (e.g. machine IP) |
| `EXPO_PUBLIC_LISCA_HTTP_PORT` | Server port when using host/port   |

On a physical device, point at your machine with `http://` URLs (not host-only).

## CLI targets

Turbo package folder is still `apps/<product>/mobile` (`@lisca/<product>-mobile`). CLI target name is **`web-native`**.

| Task        | Target        | What it does                                                     |
| ----------- | ------------- | ---------------------------------------------------------------- |
| `dev`       | `web-native`  | Expo web in browser + Rust + dev proxy (`localhost:808x`)        |
| `dev`       | `ios`         | Expo Metro for native + Rust on `0.0.0.0:876x` + LAN API URLs    |
| `dev`       | `ios-install` | USB install dev client (`expo run:ios --device`)                 |
| `build`     | `web-native`  | Export static web bundle → `apps/<product>/mobile/dist/web`      |
| `build`     | `ios`         | `expo prebuild` + Xcode Release compile (no IPA)                 |
| `dist`      | `ios`         | Archive + development IPA → `apps/<product>/mobile/release/ios/` |
| `typecheck` | `web-native`  | Typecheck the Expo app package                                   |

The old `mobile` target was renamed to **`web-native`** for dev, build, and typecheck.

## Dev

```bash
bun lisca dev aligner web-native     # Expo web — http://localhost:8081
bun lisca dev annotator web-native   # http://localhost:8082
bun lisca dev studio web-native      # http://localhost:8083
```

Web-native dev runs **Expo in the browser** (not via `vp run`). Open the **808x** URL — the CLI starts a dev proxy there that forwards API routes (`/fs`, `/align`, …) to Rust on **876x** and everything else to Expo on **908x** (808x + 1000). Same-origin resolution works like the Vite web apps.

### Native iOS (iPad / iPhone)

```bash
bun lisca dev aligner ios-install   # once: USB device → Xcode build + install dev client
bun lisca dev aligner ios             # Rust on 0.0.0.0:876x + Expo Metro with LAN API URLs
```

Test API reachability on the device: open `http://<mac-ip>:8765` in Safari.

First Skia/web load may take a few seconds while CanvasKit (WASM) initializes in web-native dev.

## Build & dist

```bash
bun lisca build aligner web-native   # static Expo web export
bun lisca build aligner ios          # prebuild + Release compile (macOS + Xcode)
bun lisca dist aligner ios           # development IPA (requires signing)
```

`dist ios` uses Xcode archive + development export. Configure signing in the generated `ios/` project before distributing.

For the production Vite web UI, use `bun lisca dev aligner web` → http://localhost:8765.

Use `bun lisca dev aligner server` for Rust only. Override the API target in the app shell or via `EXPO_PUBLIC_LISCA_*` when pointing at a remote host.

Each app uses a fixed Metro port so all three can run in parallel.

Monorepo Metro config: `scripts/metro-monorepo.cjs` (resolved from each app's `metro.config.js`). Requires `babel-preset-expo` and expo-router peers (`@expo/metro-runtime`, `expo-constants`, `expo-font`, `expo-linking`) in the mobile app package.

## Storage bootstrap

Each app wraps the tree in `StorageBootstrap` (hydrates AsyncStorage into `@lisca/storage`) before atoms read session state.

## Server connection

`ShellServerProvider` in `@lisca/ui-native` mirrors web: saved servers, active address, WS probe, settings dialog.

## Canvas

Imaging uses `@shopify/react-native-skia`. Grid math and contrast live in `@lisca/utils`; pixel prep in `@lisca/ui-native/features/canvas/frame-pixels.ts`.

## Studio results

Plot parsing lives in `@lisca/analysis`. Native charts use `react-native-svg`; PDF export uses `buildResultPdfFromCaptures` + `studioClient.saveResultPdf`.

Result chart grids switch to two columns when the plot container is at least **1024px** wide (`TABLET_LANDSCAPE_MIN_WIDTH` in `@lisca/ui-native/features/analysis/result-charts.tsx`) — tuned for tablet landscape, not desktop web breakpoints.
