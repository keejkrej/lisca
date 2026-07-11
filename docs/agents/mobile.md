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
vp run dev:aligner     # Vite web — http://localhost:8765 (Rust backend on 9765)
vp run dev:annotator   # http://localhost:8766 (Rust on 9766)
vp run dev:studio       # http://localhost:8767 (Rust on 9767)
```

Web-native and native iOS dev use Expo directly from each `apps/<product>/mobile` package (no shared orchestrator). Start the Rust backend separately with `vp run --filter @lisca/<product>-server dev`.

### Native iOS (iPad / iPhone)

```bash
cd apps/aligner/mobile && bunx expo run:ios --device   # USB install dev client
```

Test API reachability on the device: open `http://<mac-ip>:8765` in Safari.

First Skia/web load may take a few seconds while CanvasKit (WASM) initializes in web-native dev.

## Build & dist

```bash
vp run --filter @lisca/aligner-web build          # production Vite web bundle
vp run dist:aligner                                 # Tauri desktop installer
cd apps/aligner/mobile && bunx expo export --platform web   # static Expo web export
cd apps/aligner/mobile && bunx expo run:ios               # prebuild + Release compile (macOS + Xcode)
```

Use `vp run --filter @lisca/aligner-server dev` for Rust only. Override the API target in the app shell or via `EXPO_PUBLIC_LISCA_*` when pointing at a remote host.

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
