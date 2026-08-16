# Shell UI

Owned layout and theme for the Lisca SolidJS web shell (`@lisca/ui`).

The repository-wide visual contract is [`DESIGN.md`](../../DESIGN.md). This document describes
how the shell modules implement that contract; it does not define app-specific alternatives.

## Theme

Edit colors in `packages/ui/theme.css`: CSS `z-*` component classes (button, input, field, select, toggle, etc.) and theme tokens (`--background`, `--border`, `--muted`, …).

Do not scatter layout tint tokens (`railChrome`, `panel`, `stat`, etc.); shell surfaces use `background` + `border`.

## Shell components (web)

Compose apps from shell primitives, not exported class strings:

| Component                      | Role                                                                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppShell`                     | Root layout; all regions use `bg-background`                                                                                                                                      |
| `AppShell.MainScroll`          | Full-sheet document scroll viewport with a separately centered, non-scrolling content measure                                                                                     |
| `Panel`                        | Bordered in-app frame (dock, nav rail, sidebar cards)                                                                                                                             |
| `ViewportCard`                 | Padded main column; inner frame matches `Panel`                                                                                                                                   |
| `Section`                      | Collapsible in-app section inside a `Panel` (rare direct use). Title is an accordion-style trigger (hover underline); `chevron="vertical"` (up/down) or `horizontal` (left/right) |
| `PanelSection`                 | Sidebar placement variant of `Section`; full width, height hugs content; vertical carets (inverse of `DockSection`)                                                               |
| `RailControlStack`             | Default full-width vertical composition for independent controls in a stage rail                                                                                                  |
| `RailActionPair`               | Named, adaptive two-column composition for exactly two short product-authored actions with one task scope                                                                         |
| `RailFieldPair`                | Auto-stacking two-column composition reserved for semantic X/Y or Width/Height peers                                                                                              |
| `RailSectionStack`             | Canonical 16px vertical rhythm between independently collapsible stage-rail sections                                                                                              |
| `RailSidebar`                  | Full-width stage-rail scroller with a centered fixed 200px section measure and symmetric scrollbar gutters                                                                        |
| `SidebarStack`                 | Full-height scrolling sidebar region container                                                                                                                                    |
| `DockStrip`                    | Outer dock band — `flex` row, sections grouped and centered                                                                                                                       |
| `DockSection`                  | Dock placement variant of `Section`; horizontal carets; `fit="hug"` (default) or `fit="panel"` for instruction copy                                                               |
| `DialogSurface` / `ModalScrim` | Modal chrome                                                                                                                                                                      |
| `useKeyboardShortcuts`         | Web keyboard bindings; pair with `dockToolShortcuts()` from `@lisca/ui-headless/dock` for digit tool keys                                                                         |

Placement styling lives inside `DockSection`, `PanelSection`, `RailSidebar`, and `SidebarStack` — not
exported as class strings.

Frame styling lives inside `panel.tsx` (`panelFrameClass`); not exported from the package.

## Composition model

Sidebar and dock use the same layering:

1. **Region container** — `RailSidebar`, `SidebarStack`, or `DockStrip`
2. **Section variant** — `PanelSection` or `DockSection` (both inherit `Section`)
3. **Body layout** — rail primitives for stage rails; inline `flex` / `grid` in classic sidebars and docks

**App-owned docks** (aligner pattern): `AlignerDock` composes `DockStrip` + feature sections. Studio mirrors this with `StudioAssayDock`, `StudioAlignDock`, etc. under `apps/studio/*/src/components/`.

### DockSection fit

- `fit="hug"` (default) — tool, action, save sections shrink to content width.
- `fit="panel"` — instruction sections use a stable band (`min-w-56 max-w-xs`).

```tsx
<DockSection fit="panel" title="Instruction">
  <p className="line-clamp-4 text-center text-sm leading-snug">{instruction}</p>
</DockSection>
<DockSection title="Action">…</DockSection>
```

Do not add app-level instruction wrapper components; use `fit="panel"` inline in `*-dock` files.

### PanelSection

Right sidebar sections use `PanelSection`: full width (`w-full`), height hugs content. Inverse of `DockSection`, which stretches height in the dock row and uses variable width (`w-max`).

```tsx
<PanelSection title="Instruction">
  <p className="text-sm leading-snug text-muted-foreground">{instruction}</p>
</PanelSection>
```

## Layout recipes (section bodies)

Stage rails use a centered 200px content measure. `PanelSection appearance="rail"` adds no outer
padding, so headers and bodies share that full measure. `RailSidebar` owns the full-width scroll
viewport and its inner `RailSectionStack` provides the exact 16px between sections. Compose each body
with the rail primitives:

```tsx
// Default: independent actions and controls stack full width.
<RailControlStack>
  <Button className="w-full">Shuffle</Button>
  <Button className="w-full">Continue to analysis</Button>
</RailControlStack>

// Exactly two short actions with the same task scope may share 96px cells.
<RailActionPair label="Grid visibility">
  <Toggle aria-pressed={shown}>Show</Toggle>
  <Button>Reset</Button>
</RailActionPair>

// Exception: semantic coordinate or dimension peers.
<RailFieldPair>
  <Field>Offset X…</Field>
  <Field>Offset Y…</Field>
</RailFieldPair>
```

At 200px, both pair primitives produce two 96px cells separated by an 8px gutter and automatically
stack when less space is available. `RailFieldPair` remains exclusive to X/Y and Width/Height peers
with matching noun, unit, validation, and lifecycle. `RailActionPair` accepts exactly two short,
product-authored controls with a shared task scope, such as Undo/Redo or Exclude all/Edge exclude;
its required label names that scope for assistive technology and makes the relationship explicit in
code. A toggle may pair with its Reset action only when it retains a persistent state indicator.
Primary, destructive, user-authored, long-label, unrelated, and tool-row controls stay full width in
`RailControlStack`; segmented controls remain one full-width composite.

Wrap stage sections in `RailSidebar`. It owns the full 256px overflow viewport and supplies a centered,
fixed 200px `RailSectionStack`; its 16px section rhythm is distinct from spacing inside a section.
The stack uses auto block margins, which center it while it fits and collapse when it overflows so
scrolling begins at the first section rather than at an unreachable negative offset. Symmetric stable
scrollbar gutters keep the 200px measure physically centered on platforms with non-overlay scrollbars,
so action pairs do not unexpectedly stack. Stage shells keep both 256px rails inline at 1024px and
wider. Below 1024px—or in portrait orientation—the same mounted rail content moves into the
body-owned overlays so the scientific workspace retains at least 512px.

## Main document scrolling

`AppShell.Main` stays clipped in the stage shell so portrait panel controls remain fixed. Put forms,
sample lists, and result documents in its direct `AppShell.MainScroll` child. The module keeps the
scroll viewport at the full main-sheet edge and gives callers a centered `contentClass` measure:

```tsx
<AppShell.Main>
  <AppShell.MainScroll contentClass="max-w-[52rem] px-12 py-10">
    <FormOrDocument />
  </AppShell.MainScroll>
</AppShell.Main>
```

Do not put `overflow-y-auto` on the constrained content column. A nested scroll owner is reserved
for an independently navigable bounded widget such as a file list, task queue, or select menu—not a
form section, sample collection, or result gallery.

The Studio top bar groups workspace controls by function. Its left cluster contains Tasks followed
immediately by the optional Expert switch; its right cluster contains only Connected status and the
theme toggle. Expert is rendered only on routes with an expert body and never belongs in a scrolling
rail.

Classic sidebars and horizontal docks keep their established layouts:

```tsx
// Vertical action list (studio wizard) — DockSection fit="hug" (default); no centering hacks
<div className="flex flex-col gap-2">
  <Button className="w-full justify-center" size="sm" variant="outline">…</Button>
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

## Rules

1. **One layout background:** `bg-background` on AppShell and viewport padding bands.
2. **Structure = border, not tint:** panels and sections use `rounded-xl border border-border bg-background`.
3. **Apps use shell components** — do not import layout class strings; `DockSection` / `PanelSection` own their placement styles.
4. **Read-only path chips** may use `bg-muted/20` (`ReadonlyPathField`) as the one subtle inset.

## Out of scope

Do not modify implementation code in `packages/ui/src/components/ui/`; add or refresh zaidan/shadcn primitives through `packages/ui/components.json`. A verified zero-consumer primitive may be removed together with its barrel and `theme.css` references. Shell and features may import the remaining primitives normally.
