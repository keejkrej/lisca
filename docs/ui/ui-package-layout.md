# UI package layout

Source layout for the SolidJS web UI. Ownership and public imports are in [design architecture](../design/architecture.md).

## Packages

| Package                | Role                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@lisca/design-tokens` | Canonical colors, type, radius, and stage geometry. Edit `src/tokens.ts`, then run `pnpm --filter @lisca/design-tokens generate`.                     |
| `@lisca/utils`         | Framework-free logic: navigation and grid math, storage, annotation tools, shortcuts, task-center reconciliation, host and work-session picker models |
| `@lisca/ui-headless`   | SolidJS signals and interaction logic, plus the structural types and policies those modules use                                                       |
| `@lisca/ui`            | Zaidan primitives, shared patterns, and the app shell                                                                                                 |
| `@lisca/instrument`    | Align, annotate, canvas, contrast, host, navigation, and task-center UI                                                                               |

Pattern: headless hooks expose derived state and handlers for web components to render. A support module may remain beside those hooks when it defines their structural types or interaction policy. Reusable modules with no SolidJS coupling belong in `@lisca/utils`.

## `@lisca/ui`

| Path                 | Role                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/` | Vendor Zaidan primitives. Refresh through `packages/ui/components.json`. Do not edit generated implementations. |
| `src/lib/`           | `cn`                                                                                                            |
| `src/patterns/`      | Rails, sections, dialogs, path fields, and the state toggle                                                     |
| `src/shell/`         | App shell, stage frame, navbar, theme, server and workspace providers                                           |
| `theme.css`          | Component classes. Color values come from `@lisca/design-tokens/variables.css`.                                 |

A verified zero-consumer primitive may be removed together with its barrel and theme references.

### Shell subfolders

| Subfolder    | Contents                                                 |
| ------------ | -------------------------------------------------------- |
| `layout/`    | `AppShell`, viewport card, stage canvas, portrait panels |
| `chrome/`    | Navbar, connection status, update settings               |
| `server/`    | Server address dialog, shell server provider             |
| `workspace/` | Workspace provider and work-session picker               |
| `theme/`     | Shell theme provider                                     |
| `shortcuts/` | Keyboard shortcut hook                                   |

State providers (`ShellServerProvider`, `ShellWorkspaceProvider`) are exported from `@lisca/ui/shell`.

### Pattern subfolders

| Subfolder  | Contents                                           |
| ---------- | -------------------------------------------------- |
| `regions/` | Panel, section, rail, sidebar, and dock containers |
| `chrome/`  | Path button and read-only path field               |
| `modal/`   | Dialog surface and scrim                           |

## `@lisca/instrument`

Each domain is a subfolder of `packages/instrument/src` with one responsibility:

| Domain         | Contents                                                               |
| -------------- | ---------------------------------------------------------------------- |
| `align/`       | Align canvas, grid, tools, selection counts, crop progress             |
| `annotate/`    | Annotation canvas, mode toggle, tool slider, label dialog              |
| `canvas/`      | Shared canvas infra (status toasts, theme hook, prepared frames)       |
| `contrast/`    | Web contrast control using pure derivation helpers from `@lisca/utils` |
| `host/`        | Host file picker, folder parse modal, source picker                    |
| `navigation/`  | Frame, position, and ROI steppers                                      |
| `task-center/` | Task center                                                            |

### Dependency rules

- `canvas/` is shared infrastructure. `align/` and `annotate/` may import it. `canvas/` does not import other feature domains.
- Other domains do not import each other.
- Feature UI may import `@lisca/ui/patterns`, `@lisca/ui/shell`, `@lisca/ui/primitives`, a focused primitive such as `@lisca/ui/button`, `@lisca/ui-headless`, `@lisca/utils`, and `@lisca/contracts`.
- `@lisca/ui` does not import `@lisca/instrument`.

`pnpm run lint` enforces these rules through `lisca-boundaries/imports`.

### Internal vs public

Files used only inside a domain (not re-exported from `packages/instrument/src/index.ts`) include:

- `canvas/canvas-theme.ts`
- `host/host-file-picker-row.tsx`

Apps import the package barrel `@lisca/instrument`.

## Import rules for apps

```tsx
import { Button } from "@lisca/ui/button";
import { AppShell, StageCanvas } from "@lisca/ui/shell";
import { PanelSection, RailSidebar } from "@lisca/ui/patterns";
import { AlignCanvas } from "@lisca/instrument";
```

Do not import feature files by deep path (for example `@lisca/instrument/src/align/align-grid`).

## Testing

Extract logic before testing. Never mount zaidan components for behavioral coverage.

| Logic kind                                     | Package              | Test with                     |
| ---------------------------------------------- | -------------------- | ----------------------------- |
| Framework-free math, models, parsing, policies | `@lisca/utils`       | Vitest, no SolidJS            |
| SolidJS UI state and render props              | `@lisca/ui-headless` | `@solidjs/testing-library`    |
| Session atoms, frame-load policy, studio utils | `@lisca/client`      | Reducer runner + Effect mocks |
| Shell and pattern DOM                          | `@lisca/ui`          | One targeted smoke test       |
| Feature DOM                                    | `@lisca/instrument`  | One targeted smoke test       |

Decision tree for new code:

1. No SolidJS imports → `@lisca/utils` (or `@lisca/client/studio/*` for studio wizard helpers).
2. SolidJS state without DOM widgets → `@lisca/ui-headless`.
3. Atoms, session effects, API wiring → `@lisca/client`.
4. Shared chrome or a recurring presentation rule → `@lisca/ui`.
5. A product workflow surface → `@lisca/instrument`.

Co-locate tests under `packages/*/test/` mirroring the module path. `pnpm run test` runs workspace test tasks recursively.
