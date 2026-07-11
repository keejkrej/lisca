# Supported app targets

The repository currently has no Expo or React Native clients. Do not use removed
`apps/*/mobile`, `@lisca/mobile-app`, `@lisca/ui-native`, `web-native`, Metro,
or iOS targets as implementation or verification references.

## Current product layout

| Path                            | Role                                      |
| ------------------------------- | ----------------------------------------- |
| `apps/<product>/web`            | SolidJS/Vite frontend                     |
| `apps/<product>/server`         | Rust HTTP backend package                 |
| `apps/<product>/desktop`        | Tauri wrapper for the web frontend/server |
| `apps/{aligner,annotator}/demo` | Browser-only product demos                |
| `apps/landing/web`              | Public landing site                       |

`<product>` is `aligner`, `annotator`, or `studio`.

## Development

Root scripts start each product's web and server packages together:

```sh
vp run dev:aligner    # http://localhost:8765; backend 9765
vp run dev:annotator  # http://localhost:8766; backend 9766
vp run dev:studio     # http://localhost:8767; backend 9767
vp run dev:landing
```

Use a filtered task when only one workspace package is needed:

```sh
vp run --filter @lisca/aligner-web build
vp run --filter @lisca/aligner-server dev
```

## Desktop and LAN builds

```sh
vp run dist:aligner
vp run serve:aligner
```

The desktop packaging script builds the selected web and server packages,
stages the server binary and root `assets/brand` into the Tauri resources, then
runs the local Tauri CLI through `vp exec`.

## Verification

Use Playwright against the Vite app or packaged Tauri frontend. There is no
physical-iOS, Expo-web, or Metro verification path in the current repository.
