# AppShell contents by app

## Naming

**Workspace** means the **bound folder on disk** (the assay / project root you pick from the host; `workspacePath`). It is not a generic word for “main panel” or “editor.”

**Inspect mode** is the full-screen aligner experience for tiled ROI inspection (what older copy sometimes called the “ROI workspace”). Prefer **inspect mode** or **inspect surface** for the UI; do not call that screen a “workspace” unless you mean the folder.

**Align mode** is the grid / alignment canvas experience. Together, align vs inspect are **modes**, not two kinds of “workspace.”

**Session** (annotator): one editing context for the current frame/source pair—optional word if “workspace” would confuse with the folder.

**View:** One **`FooView`** component per **path route** **`/foo`** (PascalCase of the single segment). Do not stack the product name twice (`AlignerAlignView` → **`AlignView`** inside `aligner-web`). **Wizard substeps and similar flow stages are not extra path segments** — they use **query parameters** (see Routing).

---

## Routing

| Mechanism | Use |
|-----------|-----|
| **Path** | Selects the **`View`** (`/align` → `AlignView`). Aligner and annotator today: `/align`, `/inspect` / `/raw`, `/roi`. Studio: `/assay`, `/info`, `/align`, `/inspect`, `/result`. |
| **Search (query)** | Selects **steps** and other non-navigation state inside that view (`/info?step=2`, annotation mode on annotator routes, etc.). Validated with TanStack Router **search schema**, kept shareable and bookmarkable. |

Substep UI lives **inside** the route **`View`**: e.g. **`InfoView`** switches its body from **search params / props** and may use **inline or internal child components** as needed — no separate routable `*View` per substep.

---

## Eventual component tree (new / renamed)

Paths are relative to `packages/ui` (`@lisca/ui`) and each `apps/*-web/src`. **`View`** names align with **path segments** only.

```
packages/ui/src/
├── shell.tsx                          # AppShell (existing)
├── shell-theme.tsx                    # existing
├── FrameNavigation.tsx                # left slot; variants via props (align | inspect | annotate raw | annotate roi)
├── ViewerBottomBar.tsx                # bottom slot: two horizontal regions
│   ├── ViewerBottomBarContrast.tsx    # min/max + auto contrast (left region)
│   └── ViewerBottomBarPersist.tsx     # save + mode-specific persist actions (right region)
├── AlignShellTop.tsx                  # optional: connection + workspace path + mode switch + theme (or split into smaller exports)
└── ShellWorkspacePickers.tsx          # optional: host path chips (if not inlined)

apps/aligner-web/src/
├── shell/
│   └── AlignShell.tsx                 # wires AppShell + fills all slots for aligner
├── views/
│   ├── AlignView.tsx                  # `/align`
│   └── InspectView.tsx                # `/inspect`
├── chrome/
│   ├── AlignTopChrome.tsx
│   ├── AlignLeftChrome.tsx
│   ├── AlignMainChrome.tsx
│   ├── AlignBottomChrome.tsx
│   └── AlignRightChrome.tsx
└── routes/

apps/annotator-web/src/
├── shell/
│   └── AnnotatorShell.tsx
├── views/
│   ├── RawView.tsx                    # `/raw`
│   └── RoiView.tsx                    # `/roi`
├── chrome/
│   ├── AnnotatorTopChrome.tsx
│   ├── AnnotatorRightChrome.tsx
│   └── …
└── routes/

apps/studio-web/src/
├── shell/
│   └── StudioShell.tsx
├── views/
│   ├── AssayView.tsx                  # `/assay`
│   ├── InfoView.tsx                   # `/info` — body follows search (e.g. `step`); internal components as needed
│   ├── AlignView.tsx                  # `/align`
│   ├── InspectView.tsx                # `/inspect`
│   └── ResultView.tsx                 # `/result`
├── chrome/
│   ├── StudioNavRail.tsx              # Left; updates path or search when changing wizard position
│   └── StudioCommandChrome.tsx
└── routes/
```

Shared **`FrameNavigation`** and **`ViewerBottomBar*`** live in **`@lisca/ui`**. **`chrome/`** holds slot fillers per app.

---

## Aligner (`aligner-web`)

| Slot | Contents |
|------|----------|
| **Top** | WebSocket connection status, **workspace** path (folder), theme toggle, align vs inspect mode switch |
| **Left** | Frame navigation (one reusable component; behavior differs for align vs inspect) |
| **Main** | `AlignView` (`/align`) or `InspectView` (`/inspect`) |
| **Bottom** | Two horizontal halves: **left half** — contrast min/max controls and auto contrast; **right half** — save and other persist actions for the active mode |
| **Right** | Sidebar panels: source summary, histogram / exclude tooling, and other inspect-side controls that are not frame stepping |

---

## Annotator (`annotator-web`)

| Slot | Contents |
|------|----------|
| **Top** | WebSocket connection status, **workspace** path (folder), theme toggle, raw vs ROI data mode, annotation mode |
| **Left** | Frame navigation (same reusable component as aligner; behavior differs for raw vs ROI and for annotate flows) |
| **Main** | `RawView` (`/raw`) or `RoiView` (`/roi`); further options via **search** |
| **Bottom** | Two horizontal halves: **left half** — contrast min/max controls and auto contrast; **right half** — save (annotations / labels as defined by the route) |
| **Right** | Outputs section (exports, derived artifacts, secondary metadata) |

---

## Studio (`studio-web`)

| Slot | Contents |
|------|----------|
| **Top** | Theme toggle; optional compact title or status strip |
| **Left** | Studio nav rail; navigates **paths** and **query** for wizard position (e.g. `/info` + `step`) |
| **Main** | Path-sized views only: `AssayView`, `InfoView`, `AlignView`, `InspectView`, `ResultView` — **`InfoView`** changes body by **query** (and props); subcomponents stay private to that view |
| **Bottom** | Studio command bar: step instruction copy, primary step action (`next` / `save` / align commit), and step-specific tools (e.g. align pattern toolbar) |
| **Right** | Unused — no slot content |
