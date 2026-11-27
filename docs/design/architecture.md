# Design architecture

LiSCA keeps one visual language and three product apps. This is the ownership map for that split. The visual rules are in [language.md](./language.md) and [`DESIGN.md`](../../DESIGN.md).

LiSCA owns its components and uses [Effect UI](https://ui.effect.website/) (`@effect/ui` and `@effect/ui-kit`) for rendering, state, routing, and interaction behavior. Use `@effect/ui/html` builders for presentation and `@effect/ui-kit` primitives for focus, selection, popups, dialogs, sliders, and keyboard interaction. Icons live in `@lisca/ui/icons` backed by `@phosphor-icons/core` SVG paths. Components are maintained directly in this repository; there is no JSX compiler and no component registry to refresh. See [ADR-0033](../adr/0033-effect-ui-frontend.md). There is no React Native, Vue, or Svelte app in this repo, so there is no `ui-native`, `ui-vue`, or `ui-svelte` package. There is no runtime generative UI catalog.

## Layers

| Layer      | Package                              | Owns                                                                         | Does not own                     |
| ---------- | ------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------- |
| Tokens     | `@lisca/design-tokens`               | Reference colors, semantic roles, app brands, radius, type, stage geometry   | Components, product workflows    |
| Behavior   | `@lisca/ui-headless`, `@lisca/utils` | Framework-free interaction state and domain models                           | DOM, brand styling               |
| Primitives | `@lisca/ui` `src/components/ui`      | LiSCA-owned controls wrapping `@effect/ui-kit` and `@effect/ui/html`         | Fetching, routing, assay rules   |
| Patterns   | `@lisca/ui/patterns`                 | Recurring presentation: rails, sections, dialogs, path fields, state toggles | Workspace data                   |
| Shell      | `@lisca/ui/shell`                    | `AppShell`, stage frame, navbar, theme, server and workspace providers       | Align or annotate workflows      |
| Feature UI | `@lisca/instrument`                  | Align, annotate, contrast, navigation, host pickers, task center             | A second button or spacing scale |

The primitives live in `packages/ui/src/components/ui`. Maintain them directly and test the behavior their public interfaces promise. Read `packages/ui/node_modules/@effect/ui/AGENTS.md` before changing Effect UI components or controls. `@effect/ui-devtools` is wired in development builds via `@lisca/web-app`.

## Public imports

```ts
import { Button } from "@lisca/ui/button";
import { cn } from "@lisca/ui/cn";
import { Icon } from "@lisca/ui/icons";
import { Button, Field } from "@lisca/ui/primitives";
import { PanelSection, RailSidebar, StateToggleIndicator } from "@lisca/ui/patterns";
import { AppShell, ShellNavbar } from "@lisca/ui/shell";
import { AlignCanvas, TaskCenter } from "@lisca/instrument";
```

`@lisca/ui/button` is the focused primitive path. `@lisca/ui/cn` is the classname helper. `@lisca/ui/primitives` is the catalog barrel. Application code renders `Button`. `buttonVariants`, `fieldVariants`, and `toggleVariants` stay available to `@lisca/ui` and `@lisca/instrument` when a non-button element must carry the control's styles.

## Dependency direction

Feature UI may import patterns, primitives, shell, headless state, utils, and contracts. The shell may import patterns and primitives. Primitives may import tokens. Tokens import nothing from the product. `@lisca/ui` does not import `@lisca/instrument`.

Inside `@lisca/instrument`, `align` and `annotate` may import `canvas`. Other feature domains do not import each other. Do not import `@lisca/instrument` or the `@lisca/ui` root barrel from a feature domain.

`pnpm run lint` enforces these rules with `lisca-boundaries/imports`.

## Tokens

`packages/design-tokens/src/tokens.ts` is the only hand-edited color, radius, type, and stage-geometry source. `pnpm --filter @lisca/design-tokens generate` writes `generated/variables.css`. The package test fails when that file is stale. `@lisca/ui/theme.css` imports the generated file and keeps component classes only.

Stage geometry utilities are `w-rail`, `h-topbar`, `w-rail-content`, and `ml-rail-inset`.

## Decision sequence

1. Reuse a primitive, pattern, or instrument component.
2. Compose approved controls in the app.
3. Add a shared pattern only when the same presentation rule already appears in more than one product surface.
4. Extend the owned primitive or compose `@effect/ui-kit` behaviors, with a short note in `docs/design/language.md` when the variant is new. Verify keyboard, focus, dismissal, and visual states.

## Checks

- `pnpm --filter @lisca/design-tokens test` checks generated CSS.
- `pnpm --filter @lisca/ui test` and `pnpm --filter @lisca/instrument test` cover shell and feature behavior.
- `pnpm run lint` covers import direction.
- `packages/web-app/app.css` `@source`s `@lisca/ui` and `@lisca/instrument`. Tailwind scans that file's directory and each app's Vite root, and it skips `node_modules`, so instrument utilities are invisible unless listed. `scripts/tailwind-sources.test.ts` fails when a rail class drops out of the scan.
