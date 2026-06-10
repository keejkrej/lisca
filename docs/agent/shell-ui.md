# Shell UI

Owned layout and theme for Lisca web (`@lisca/ui`) and native (`@lisca/ui-native`) shells.

## Theme

Edit colors in one place per platform:

- **Web:** `packages/ui/coss-theme.css` — CSS variables (`--background`, `--border`, `--muted`, …).
- **Native:** `packages/ui-native/src/theme/tokens.ts` — mirrors the core coss set (`background`, `foreground`, `border`, `muted`, `primary`, …).

Do not scatter layout tint tokens (`railChrome`, `panel`, `stat`, etc.); shell surfaces use `background` + `border`.

## Shell components (web)

Compose apps from shell primitives, not exported class strings:

| Component | Role |
| --------- | ---- |
| `AppShell` | Root layout; all regions use `bg-background` |
| `Panel` | Bordered in-app frame (dock, nav rail, sidebar cards) |
| `ViewportCard` | Padded main column; inner frame matches `Panel` |
| `Section` | Collapsible in-app section inside a `Panel` (rare direct use) |
| `SidebarStack` | Sidebar region container (`flex-col gap-2 overflow-auto p-3`) |
| `SidebarSection` | Sidebar placement variant of `Section` (shrink + scrollable body) |
| `DockStrip` | Outer dock band — `panels={2}` or `panels={3}` |
| `DockSection` | Dock placement variant of `Section` (fill cell + centered body) |
| `DialogSurface` / `ModalScrim` | Modal chrome |
| `StatTile` | Count/metric tile: `border border-border bg-background` |

Placement presets live in `packages/ui/src/shell/section-placement.ts` (`sidebarSectionClass`, `dockSectionClass`, …).

Frame styling lives inside `panel.tsx` (`panelFrameClass`); not exported from the package.

## Composition model

Sidebar and dock use the same layering:

1. **Region container** — `SidebarStack` or `DockStrip`
2. **Section variant** — `SidebarSection` or `DockSection` (both inherit `Section`)
3. **Body layout** — inline `flex` / `grid` divs in app-owned `*Section` / `*Dock` components

**App-owned docks** (aligner pattern): `AlignerDock` composes `DockStrip` + feature sections. Studio mirrors this with `StudioAssayDock`, `StudioAlignDock`, etc. under `apps/studio/*/src/components/`.

## Layout recipes (section bodies)

```tsx
// Vertical action list (studio wizard)
<div className="flex w-full flex-col gap-2">
  <Button className="w-full max-w-48 justify-center" size="sm" variant="outline">…</Button>
</div>

// 2×2 tool/save matrix
<div className="flex w-full flex-col gap-2">
  <div className="grid w-full grid-cols-2 gap-2">…</div>
</div>

// 3-column save row
<div className="grid w-full grid-cols-3 gap-2">…</div>

// Wide cell
<div className="col-span-2 min-w-0">…</div>
```

Native: `View` with `flexDirection: "row"`, `gap: 8`, children `flex: 1, minWidth: 0` (see aligner mobile save section).

## Rules

1. **One layout background:** `bg-background` on AppShell and viewport padding bands.
2. **Structure = border, not tint:** panels and sections use `rounded-xl border border-border bg-background`.
3. **Apps use components** — do not import layout class strings (e.g. no `surfacePanelClass`).
4. **Read-only path chips** may use `bg-muted/20` (`ReadonlyPathField`) as the one subtle inset.

## Out of scope

**Do not edit** `packages/ui/src/components/ui/` — vendor coss/shadcn primitives (`Button`, `Input`, `Card`, …). Shell and features may import them; theme vars in `coss-theme.css` still apply.

Forms and dialogs that use coss `Card` may keep `--card`; shell layout frames do not use `bg-card`.

## Native parity

`packages/ui-native/src/shell/` mirrors the same mental model: `SidebarStack`, `SidebarSection`, `DockSection`, `AppShell` regions and panel frames use `colors.background` and `colors.border`. Feature code should not introduce separate layout chrome tokens.
