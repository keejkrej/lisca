# UI package layout

Source layout for `@lisca/ui` (web) and `@lisca/ui-native` (mobile). Both packages mirror the same domain boundaries under `features/` and the same shell subfolders where applicable.

## Top-level folders

| Path | Role |
| ---- | ---- |
| `components/ui/` | Vendor coss primitives — **do not edit** (web only) |
| `hooks/` | Generic React hooks (`useLatest`) — web only |
| `lib/` | Shared utilities (`cn`) — web only |
| `shell/` | Layout scaffold, regions, chrome, modals, server connectivity, workspace |
| `features/` | Domain UI shared across apps |
| `theme/` | Native theme tokens and providers (`@lisca/ui-native` only) |

Shell composition rules live in [shell-ui.md](./shell-ui.md).

## Headless vs platform split

| Layer | Package | Responsibility |
| ----- | ------- | -------------- |
| Pure domain logic | `@lisca/utils` | Navigation label math, folder template detection, align grid math, frame helpers |
| Headless UI state | `@lisca/ui-headless` | React hooks and render-prop components: contrast control, canvas transactions, align handlers, host picker state, slider stepper draft state, crop progress derive, folder parse modal state |
| Platform UI | `@lisca/ui` / `@lisca/ui-native` | DOM or React Native rendering only; import headless hooks and utils, re-export public APIs from `features/index.ts` |

Pattern: headless component exposes `children(state)` (see `ContrastControl`); hooks expose derived state + handlers for platform shells to render.

## Feature domains

Each domain is a subfolder under `features/` with a single responsibility:

| Domain | Contents |
| ------ | -------- |
| `align/` | Align canvas, grid, tools, selection counts, crop progress |
| `annotate/` | Annotation canvas, mode toggle, tool slider, label dialog |
| `canvas/` | Shared canvas infra (status toasts, theme hook, resource transactions) |
| `contrast/` | Platform contrast control wrapping headless `ContrastControl` |
| `host/` | Host file picker, folder parse modal, source picker |
| `navigation/` | Frame/position/ROI steppers |
| `analysis/` | Result panel charts (web: Observable Plot; native: Victory Native on Skia in `victory/`) |
| `studio/` | Native-only studio widgets (histogram, nav button) |

### Dependency rules

- `canvas/` is shared infrastructure — `align/` and `annotate/` may import from it; `canvas/` must not import from other feature domains.
- No cross-domain imports (e.g. `host/` must not import from `align/`).
- Features may import `shell/*`, `@lisca/ui-headless/*`, `@lisca/utils`, and `components/ui/*` (web); they must not import app code.

### Internal vs public

Files used only inside a domain (not re-exported from `features/index.ts`) include:

- `canvas/canvas-theme.ts`
- `host/host-file-picker-row.tsx`

Treat these as implementation details; do not import them from apps.

## Shell subfolders

| Subfolder | Contents |
| --------- | -------- |
| `layout/` | `AppShell`, viewport card, route loading fallback |
| `regions/` | Panel, section, sidebar/dock containers |
| `chrome/` | Navbar, path button, connection status, stat tile, readonly path (native: buttons, field, slider) |
| `modal/` | Dialog surface and scrim |
| `server/` | Server address dialog, shell server provider, WS probe |
| `workspace/` | Workspace/source path provider |
| `theme/` | Shell theme provider (web) |
| `shortcuts/` | Keyboard shortcut hook |

State providers (`ShellServerProvider`, `ShellWorkspaceProvider`) are re-exported from `@lisca/ui/shell` — there is no separate `@lisca/ui/state` path.

## Import rules for apps

**Web** — use subpaths only:

```tsx
import { AppShell, DockStrip } from "@lisca/ui/shell";
import { AlignCanvas } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { useLatest } from "@lisca/ui/hooks";
```

**Mobile** — import from `@lisca/ui-native` root or `/shell` / `/features` subpaths.

Do not import feature files by deep path (e.g. `@lisca/ui/src/features/align/...`).

## Native parity

When adding a web feature file, check whether `@lisca/ui-native` needs a parallel under the same domain folder. Shared logic belongs in `@lisca/ui-headless` or `@lisca/utils` first; platform files should be thin renderers. Native-only extras belong in `features/studio/` or the relevant domain with a comment if web has no counterpart.

## Testing

Extract logic before testing. Never mount coss or React Native components for behavioral coverage.

| Logic kind | Package | Test with |
| ---------- | ------- | --------- |
| Pure math, parsing, contrast derive | `@lisca/utils` | Vitest, no React |
| React UI state (hooks, render-prop) | `@lisca/ui-headless` | `renderHook` / render-prop children |
| Session atoms, frame-load policy, studio utils | `@lisca/client` | Reducer runner + Effect mocks |
| DOM / RN rendering | `@lisca/ui`, `@lisca/ui-native` | Skip (or one smoke test max) |

Decision tree for new code:

1. No React imports → `@lisca/utils` (or `@lisca/client/studio/*` for studio wizard helpers).
2. React state without platform widgets → `@lisca/ui-headless`.
3. Atoms, session effects, API wiring → `@lisca/client`.
4. Presentation only → platform package; import headless hooks.

Co-locate tests under `packages/*/test/` mirroring the module path. Root `check` runs `@lisca/utils`, `@lisca/ui-headless`, and `@lisca/client` tests via `test:packages`.
