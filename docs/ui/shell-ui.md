# Shell UI

Owned layout and theme for the Lisca SolidJS web shell (`@lisca/ui`).

The repository-wide visual contract is [`DESIGN.md`](../../DESIGN.md). This document describes
how the shell modules implement that contract; it does not define app-specific alternatives.

## Theme

Edit colors in `packages/ui/theme.css`: CSS `z-*` component classes (button, input, field, select, toggle, etc.) and theme tokens (`--background`, `--border`, `--muted`, …).

Studio, Aligner, and Annotator set `data-lisca-app` on the document root so `--primary`, `--ring`, and `--sidebar-primary` resolve to that app's icon color. Landing stays unscoped ink. GFP (`--instrument-gfp`) and destructive stay separate from brand chrome.

Do not scatter layout tint tokens (`railChrome`, `panel`, `stat`, etc.); shell surfaces use `background` + `border`.

## Instrument stage shell

Studio, Aligner, and Annotator use `AppShell variant="stage"` as the live product chrome. The reference desktop is 1440×900 with fixed columns **256px / 928px / 256px** (`w-64` rails, no `w-72` overrides). The center column begins with a 56px `AppShell.TopBar`, then the main sheet. The top bar and paper sheet are flat (`rounded-2xl border border-border`); rails stay flat.

```tsx
<AppShell variant="stage">
  <AppShell.Body>
    <AppShell.Left>
      <RailSidebar>{/* nav + instrument */}</RailSidebar>
    </AppShell.Left>
    <AppShell.MainColumn>
      <AppShell.TopBar>{/* ShellNavbar or demo chrome */}</AppShell.TopBar>
      <AppShell.Main>
        <ViewportCard variant="stage">
          <StageCanvas aspect="wide" captionLeft="…" captionRight="…">
            {/* canvas */}
          </StageCanvas>
        </ViewportCard>
      </AppShell.Main>
    </AppShell.MainColumn>
    <AppShell.Right>
      <RailSidebar>{/* instruction + instrument / action */}</RailSidebar>
    </AppShell.Right>
  </AppShell.Body>
</AppShell>
```

Do **not** put instrument tools or save actions in `AppShell.Dock` / `DockStrip`. Bottom docks are not the live instrument chrome.

### Rails and StageCanvas

| Piece                                                   | Role                                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `RailSidebar`                                           | Full 256px overflow viewport; centers a fixed 200px `RailSectionStack` with 16px section rhythm |
| `PanelSection appearance="rail"`                        | Collapsible rail section (vertical carets)                                                      |
| `RailControlStack` / `RailActionPair` / `RailFieldPair` | Body layout inside rail sections                                                                |
| `ViewportCard variant="stage"`                          | Padded main sheet around the canvas                                                             |
| `StageCanvas`                                           | Shared muted well + tracked captions (`aspect="wide"` for Align, `square` for Annotate)         |

Stage shells keep both 256px rails inline at 1024px and wider. Below 1024px—or in portrait orientation—the same mounted rail content moves into body-owned overlays so the scientific workspace retains at least 512px.

### App rail mapping

- **Aligner:** left — Navigation, Contrast, Tool; right — Grid, Geometry, Selection, Action.
- **Annotator:** left — Navigation, Contrast, segmentation Tool; right — Mode, Labels, Edit, optional Brush, Action.
- **Studio:** left — workflow navigation; center — active task; right — Instruction plus basic/expert instrument stacks. Embedded Align/Annotate stages reuse the standalone component rules, names, and order.

### Studio Instruction + Expert

Studio’s right rail always shows an Instruction section when the route provides copy, then either the default instrument stack or the expert stack. Expert mode is a workspace-level setting: render its compact checkmark toggle (Show/Edit family: persistent indicator, `aria-pressed`, brand fill when on) in the Studio top bar only on routes with an expert body. Place it immediately after Tasks in the left cluster; the right cluster is Connected + theme only. Never put Expert at the bottom of a scrolling rail.

## Shell components (web)

Compose apps from shell primitives, not exported class strings:

| Component                      | Role                                                                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppShell`                     | Root layout; `variant="stage"` for instrument chrome, default for classic document shells                                                                                         |
| `AppShell.TopBar`              | Floating 56px stage header inside `MainColumn`                                                                                                                                    |
| `AppShell.MainScroll`          | Full-sheet document scroll viewport with a separately centered, non-scrolling content measure                                                                                     |
| `StageCanvas`                  | Shared stage well + caption row for Align/Annotate viewports                                                                                                                      |
| `Panel`                        | Bordered in-app frame (nav rail, sidebar cards, classic panels)                                                                                                                   |
| `ViewportCard`                 | Padded main column; `variant="stage"` for the instrument sheet                                                                                                                    |
| `Section`                      | Collapsible in-app section inside a `Panel` (rare direct use). Title is an accordion-style trigger (hover underline); `chevron="vertical"` (up/down) or `horizontal` (left/right) |
| `PanelSection`                 | Sidebar/rail placement variant of `Section`; full width, height hugs content; vertical carets                                                                                     |
| `RailControlStack`             | Default full-width vertical composition for independent controls in a stage rail                                                                                                  |
| `RailActionPair`               | Named, adaptive two-column composition for exactly two short product-authored actions with one task scope                                                                         |
| `RailFieldPair`                | Auto-stacking two-column composition reserved for semantic X/Y or Width/Height peers                                                                                              |
| `RailSectionStack`             | Canonical 16px vertical rhythm between independently collapsible stage-rail sections                                                                                              |
| `RailSidebar`                  | Full-width stage-rail scroller with a centered fixed 200px section measure and symmetric scrollbar gutters                                                                        |
| `SidebarStack`                 | Full-height scrolling sidebar region container (classic non-stage sidebars)                                                                                                       |
| `DockStrip`                    | Classic horizontal dock band — not used by the live Align/Annotate/Studio instrument stages                                                                                       |
| `DockSection`                  | Dock placement variant of `Section`; horizontal carets; `fit="hug"` (default) or `fit="panel"` for instruction copy                                                               |
| `DialogSurface` / `ModalScrim` | Modal chrome                                                                                                                                                                      |
| `useKeyboardShortcuts`         | Web keyboard bindings; pair with `dockToolShortcuts()` from `@lisca/ui-headless/dock` for digit tool keys                                                                         |

Placement styling lives inside `DockSection`, `PanelSection`, `RailSidebar`, and `SidebarStack` — not
exported as class strings.

Frame styling lives inside `panel.tsx` (`panelFrameClass`); not exported from the package.

## Composition model

**Stage rails** (live instrument chrome):

1. **Region container** — `RailSidebar`
2. **Section variant** — `PanelSection appearance="rail"`
3. **Body layout** — `RailControlStack` / `RailActionPair` / `RailFieldPair`

**Classic sidebars and docks** (document/wizard leftovers, demos that have not migrated, or non-instrument panels):

1. **Region container** — `SidebarStack` or `DockStrip`
2. **Section variant** — `PanelSection` or `DockSection`
3. **Body layout** — inline `flex` / `grid`

App-owned instrument composition lives in the stage rails (`AlignerLeft` / `AlignerRight`, `AnnotatorLeft` / `AnnotatorRight`, Studio nav + `StudioRightPanel` with Instruction and instrument stacks). Do not revive bottom `*-dock` wrappers as product chrome.

### DockSection fit

- `fit="hug"` (default) — tool, action, save sections shrink to content width.
- `fit="panel"` — instruction sections use a stable band (`min-w-56 max-w-xs`).

```tsx
<DockSection fit="panel" title="Instruction">
  <p className="line-clamp-4 text-center text-sm leading-snug">{instruction}</p>
</DockSection>
<DockSection title="Action">…</DockSection>
```

Prefer Studio’s rail Instruction section for stage shells; use `fit="panel"` only when composing a classic horizontal dock.

### PanelSection

Rail and right-sidebar sections use `PanelSection`: full width (`w-full`), height hugs content. Inverse of `DockSection`, which stretches height in the dock row and uses variable width (`w-max`).

```tsx
<PanelSection appearance="rail" title="Instruction">
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
so action pairs do not unexpectedly stack.

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
immediately by the optional Expert checkmark toggle (Show/Edit family); its right cluster contains
only Connected status and the theme toggle. Expert is rendered only on routes with an expert body
and never belongs in a scrolling rail.

Classic sidebars and horizontal docks keep their established layouts when still needed outside the
instrument stage:

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

1. **One layout background:** stage uses muted surround + paper sheet; classic shells use `bg-background` on AppShell and viewport padding bands.
2. **Structure = border, not tint:** panels and sections use `rounded-xl border border-border bg-background`.
3. **Apps use shell components** — do not import layout class strings; `DockSection` / `PanelSection` / `RailSidebar` own their placement styles.
4. **Instrument chrome is stage rails** — 256px `RailSidebar`, `StageCanvas`, top-bar Expert; not bottom docks.
5. **Read-only path chips** may use `bg-muted/20` (`ReadonlyPathField`) as the one subtle inset.

## Demo shells

Standalone **Aligner** and **Annotator** demos (`apps/aligner/demo`, `apps/annotator/demo`) use the same stage shell, 256px rails, shared rail primitives, and `StageCanvas` as the real apps. Embedded landing previews keep a compact classic `AppShell` + inline toolbar so the marketing page is not restyled. The Studio analysis demo may still use a classic horizontal dock for assay actions; treat that as a leftover, not the Align/Annotate instrument pattern. `@lisca/web-demo` supplies demo state and `DemoNavbar` only — it does not own shell layout.

## Out of scope

Do not modify implementation code in `packages/ui/src/components/ui/`; add or refresh zaidan/shadcn primitives through `packages/ui/components.json`. A verified zero-consumer primitive may be removed together with its barrel and `theme.css` references. Shell and features may import the remaining primitives normally.
