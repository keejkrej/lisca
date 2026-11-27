# ADR-0033: LiSCA frontends use Effect UI and Effect UI Kit instead of SolidJS and UI SDK

- **Status:** accepted
- **Date:** 2026-11-26
- **Supersedes:** [ADR-0031](0031-ui-sdk-owned-controls.md)

## Decision

Replace SolidJS, `@ui-sdk/core`, `@effect/atom-solid`, `@tanstack/solid-router`, `vite-plugin-solid`, `phosphor-icons-solid`, and `lucide-solid` across all shared packages and all three product apps (`studio`, `aligner`, `annotator`) with Effect UI (`@effect/ui`, `@effect/ui-kit`, `@effect/ui-devtools`) on Effect 4.1.6+. Standardize icons on `@phosphor-icons/core` SVG paths rendered through `@lisca/ui/icons`.

## Why

LiSCA already uses Effect across contracts, client transports, reactivity, and session logic. Previously, the frontend bridged three separate systems: SolidJS 1 JSX, a hand-maintained `@ui-sdk/core` Solid 1 binding (`packages/ui/src/lib/ui-sdk.tsx`), and `@tanstack/solid-router`.

Effect UI unifies rendering, component state, Commands, Subscriptions, Mounts, headless shared-state providers, accessible UI primitives (`@effect/ui-kit`), typed hash/history routing (`Route` + `BrowserRouter`), and development inspection (`@effect/ui-devtools`) directly on Effect in plain TypeScript without JSX transforms or custom renderer adapters.

`@lisca/ui`, `@lisca/ui-headless`, `@lisca/instrument`, and `@lisca/web-app` keep their existing ownership boundaries and design tokens (`@lisca/design-tokens` and `@lisca/ui/theme.css`). Runtime non-serializable ports (`ShellServerProbe`, `HostFilePickerPort`, `TaskCenterPort`, `LabelFreeClientPort`) are provided via Effect `Context.Reference` + `Layer`, keeping component props and models Schema-serializable.

## Looks like a bug when

An agent reintroduces JSX / `.tsx` files, SolidJS, `@ui-sdk/core`, `@tanstack/solid-router`, or `phosphor-icons-solid` / `lucide-solid`, or bypasses `@lisca/ui/icons` for standard Phosphor UI icons. Read `packages/ui/node_modules/@effect/ui/AGENTS.md` before adding or modifying Effect UI components.
