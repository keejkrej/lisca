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
|-----------|------|
| `AppShell` | Root layout; all regions use `bg-background` |
| `Panel` | Bordered in-app frame (dock, nav rail, sidebar cards) |
| `ViewportCard` | Padded main column; inner frame matches `Panel` |
| `Section` | Collapsible dock section inside a `Panel` |
| `DialogSurface` / `ModalScrim` | Modal chrome |
| `StatTile` | Count/metric tile: `border border-border bg-background` |

Frame styling lives inside `panel.tsx` (`panelFrameClass`); not exported from the package.

## Rules

1. **One layout background:** `bg-background` on AppShell and viewport padding bands.
2. **Structure = border, not tint:** panels and sections use `rounded-xl border border-border bg-background`.
3. **Apps use components** — do not import layout class strings (e.g. no `surfacePanelClass`).
4. **Read-only path chips** may use `bg-muted/20` (`ReadonlyPathField`) as the one subtle inset.

## Out of scope

**Do not edit** `packages/ui/src/components/ui/` — vendor coss/shadcn primitives (`Button`, `Input`, `Card`, …). Shell and features may import them; theme vars in `coss-theme.css` still apply.

Forms and dialogs that use coss `Card` may keep `--card`; shell layout frames do not use `bg-card`.

## Native parity

`packages/ui-native/src/shell/` mirrors the same mental model: `AppShell` regions and panel frames use `colors.background` and `colors.border`. Feature code should not introduce separate layout chrome tokens.
