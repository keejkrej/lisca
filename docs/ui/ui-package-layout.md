# UI package layout

Source layout for the SolidJS web UI in `@lisca/ui`, with Solid-coupled non-DOM state and interaction logic in `@lisca/ui-headless` and framework-free logic in `@lisca/utils`.

## Top-level folders

| Path             | Role                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| `components/ui/` | Vendor zaidan (shadcn for SolidJS/Kobalte) primitives — **do not edit** |
| `lib/`           | Shared utilities (`cn`)                                                 |
| `shell/`         | Layout scaffold, regions, chrome, modals, server connectivity           |
| `features/`      | Domain UI shared across web apps                                        |

Shell composition rules live in [shell-ui.md](./shell-ui.md).

Vendor primitives are registry-managed: do not modify their implementation code; add or refresh them
through `packages/ui/components.json`. A verified zero-consumer primitive may be removed together with
its barrel and theme references.

## Headless vs platform split

| Layer                | Package              | Responsibility                                                                                                                                                                                |
| -------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework-free logic | `@lisca/utils`       | Navigation and grid math, storage adapters, annotation tools, shortcuts, task-center reconciliation, host and work-session picker models                                                      |
| Headless UI state    | `@lisca/ui-headless` | SolidJS signals and interaction logic, plus directly supporting structural types and interaction policies: canvas transactions/handlers, host picker state, slider state and modal derivation |
| Web UI               | `@lisca/ui`          | DOM rendering with zaidan/Kobalte and Tailwind; imports headless state and utils, and exports public APIs from `features/index.ts`                                                            |

Pattern: headless hooks expose derived state and handlers for web components to render. A support module may remain beside those hooks when it defines their structural types or interaction policy; reusable modules with no SolidJS coupling belong in `@lisca/utils`.

## Feature domains

Each domain is a subfolder under `features/` with a single responsibility:

| Domain        | Contents                                                               |
| ------------- | ---------------------------------------------------------------------- |
| `align/`      | Align canvas, grid, tools, selection counts, crop progress             |
| `annotate/`   | Annotation canvas, mode toggle, tool slider, label dialog              |
| `canvas/`     | Shared canvas infra (status toasts, theme hook, resource transactions) |
| `contrast/`   | Web contrast control using pure derivation helpers from `@lisca/utils` |
| `host/`       | Host file picker, folder parse modal, source picker                    |
| `navigation/` | Frame/position/ROI steppers                                            |

### Dependency rules

- `canvas/` is shared infrastructure — `align/` and `annotate/` may import from it; `canvas/` must not import from other feature domains.
- No cross-domain imports (e.g. `host/` must not import from `align/`).
- Features may import `shell/*`, `@lisca/ui-headless/*`, `@lisca/utils`, and `components/ui/*` (web, zaidan primitives); they must not import app code.

`vp lint` enforces these feature-domain rules through `lisca-boundaries/imports`.

### Internal vs public

Files used only inside a domain (not re-exported from `features/index.ts`) include:

- `canvas/canvas-theme.ts`
- `host/host-file-picker-row.tsx`

Treat these as implementation details; do not import them from apps.

## Shell subfolders

| Subfolder    | Contents                                               |
| ------------ | ------------------------------------------------------ |
| `layout/`    | `AppShell`, viewport card, route loading fallback      |
| `regions/`   | Panel, section, rail/sidebar/dock containers           |
| `chrome/`    | Navbar, path button, connection status, progress bar   |
| `modal/`     | Dialog surface and scrim                               |
| `server/`    | Server address dialog, shell server provider, WS probe |
| `workspace/` | Workspace/source path provider                         |
| `theme/`     | Shell theme provider (web)                             |
| `shortcuts/` | Keyboard shortcut hook                                 |

State providers (`ShellServerProvider`, `ShellWorkspaceProvider`) are re-exported from `@lisca/ui/shell` — there is no separate `@lisca/ui/state` path.

## Import rules for apps

Use public subpaths only:

```tsx
import { AppShell, RailSidebar, StageCanvas } from "@lisca/ui/shell";
import { AlignCanvas } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
```

Do not import feature files by deep path (e.g. `@lisca/ui/src/features/align/...`).

## Testing

Extract logic before testing. Never mount zaidan components for behavioral coverage.

| Logic kind                                     | Package              | Test with                                |
| ---------------------------------------------- | -------------------- | ---------------------------------------- |
| Framework-free math, models, parsing, policies | `@lisca/utils`       | Vitest, no SolidJS                       |
| SolidJS UI state and render props              | `@lisca/ui-headless` | `@solidjs/testing-library`               |
| Session atoms, frame-load policy, studio utils | `@lisca/client`      | Reducer runner + Effect mocks            |
| DOM rendering                                  | `@lisca/ui`          | Skip, or keep to one targeted smoke test |

Decision tree for new code:

1. No SolidJS imports → `@lisca/utils` (or `@lisca/client/studio/*` for studio wizard helpers).
2. SolidJS state without DOM widgets → `@lisca/ui-headless`.
3. Atoms, session effects, API wiring → `@lisca/client`.
4. DOM presentation only → `@lisca/ui`; import headless state.

Co-locate tests under `packages/*/test/` mirroring the module path. `vp run test` runs workspace test tasks recursively.
