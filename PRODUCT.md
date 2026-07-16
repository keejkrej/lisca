# LiSCA product shape

What LiSCA is, how its pieces relate, and what bounds it — stated without optimism.

This file exists to answer three questions: **where does this code go**, **should this be shared**,
and **does this app get this feature**. Anything that does not help answer one of those does not
belong here. There is no roadmap, no positioning, and no vision copy below.

Read alongside:

- **`CONTEXT.md`** — the domain glossary. Every term below is defined there; this file does not restate them.
- **`AGENTS.md`** — the tech stack and working rules. Its Purpose block is the two-line summary of this file.
- **`docs/analysis/analysis.md`** — the analysis pipeline's workspace I/O table.

## The spine: the Workspace

**The Workspace is the product.** Not the apps — the on-disk experiment directory they all read and write.

The reason is architectural, and it explains everything else on this page:

**There is no server, so there is no server-side state. The filesystem is the database.**

- `render.yaml` deploys exactly one service — `lisca-landing`, `runtime: static`. The only thing
  LiSCA ships to the internet is the marketing site.
- The product ships as a Tauri desktop app, or self-hosted via `docker-compose`, bind-mounting
  `${LISCA_ROOT:-/var/lisca}/{workspace,source,config}` off the host.
- There is no database.
- `crates/lisca/src/http/auth.rs` is not access control. It is a local profile switcher — opaque
  bearer tokens mapped to profile ids in a `sessions.json` under `~/.lisca`
  (`crates/lisca/src/profile/session.rs`).

So every route is keyed by a `workspace_path` (53 occurrences across the handlers), and the apps
compose by agreeing on a directory rather than by calling each other. `docker-compose.yml` makes
this literal: `x-lisca-volumes` bind-mounts the **same** `/var/lisca/workspace` into the aligner,
annotator, and studio services. The workspace bus is provisioned infrastructure.

**Where does this code go? → Whichever crate owns that slice of the workspace.**

| Shell | Workspace slice | Assay template | Remembers you |
|---|---|---|---|
| **Aligner** | writes `align/`, `bbox/`, `roi/` | no | no |
| **Annotator** | reads `roi/`, writes masks + `annotations/` | no | no |
| **Studio** | all of the above, plus `assay.json` → `mask/`, `timeseries/`, `results/` | **yes** | **yes** |

The chain is unbroken and runs through the filesystem: Aligner writes `bbox/Pos{n}.csv`; ROI crop
reads it and writes `roi/Pos{n}/`; Annotator reads `roi/Pos{n}/Roi{m}/` and writes masks plus
`annotations/labels.json`; analysis reads `assay.json` + `roi/` and writes results. Nothing in those
paths is app-scoped. Align a workspace in Aligner, point Studio at the same directory, and the
`bbox/` files are simply there.

That is what "pipeline" means in `AGENTS.md`. It describes the **user's workflow and the artifact
chain** — not app-to-app calls.

For the analysis half of the layout, see the I/O table in `docs/analysis/analysis.md`. It is not
duplicated here; a second copy would drift and then lie.

### The on-disk contract is implicit and unversioned

There is no version field in `packages/contracts/src/assay.schema.ts` and no schema-version marker
on the workspace layout anywhere. The layout exists only as the union of the path-building functions
in `crates/lisca`. Nothing declares it, validates it, or migrates it.

An agent editing `bbox/` or `roi/Pos{n}/Roi{m}/` is changing **the product's real interface**, across
three shells and two languages, with no compatibility signal to warn it. The only thing enforcing the
contract is that the paths happen to agree.

## How the shells compose

**The backend composes totally.** `apps/studio/server/src/main.rs` merges `aligner_server::router()`
and `annotator_server::router()` into its own router, takes both as path dependencies, and implements
`HasCropJobs` and `HasAnalysisJobs` on `StudioState`. Studio's binary *is* Aligner + Annotator +
analysis on one port (Studio 8767, Aligner 8765, Annotator 8766). It serves the identical `/align/*`
and `/annotate/*` routes from the identical crates. Nothing is reimplemented.

**The frontend composes only at the primitive level.** `apps/studio/web/src/components/studio-align-main.tsx`
and `apps/aligner/web/src/components/aligner-main.tsx` both build on the same `@lisca/ui/features`
primitives, but each shell wires its own state and modals around them — `useStudioAlignCanvas` beside
`useAlignCanvas`, `StudioCropConfirmModal` beside `CropConfirmModal`. Studio does not import the
Aligner app.

The two layers compose at different granularities. That asymmetry is the shape; what to do about it,
if anything, is not this file's business.

## Studio is the opinionated shell

`http::profile::router()` is merged only by Studio's `main.rs`. Aligner and Annotator never call it,
and `docker-compose.yml` gives `config:/root/.lisca` only to the studio service.

**Studio remembers who you are and which workspaces you touched. Aligner and Annotator are stateless
tools you point at a directory and walk away from.** They hold no opinion about you, your history, or
your assay — which is what makes them usable as standalone tools feeding an external pipeline: the
workspace directory *is* the export.

This is also why `packages/storage` exists. It is the only per-user state in the product, and exactly
one shell uses it.

## Assays are a closed enum, not an extension point

`AGENTS.md` says "More assay types follow the same `assay.json` + Rust pipeline pattern." Adding an
assay is a **cross-cutting change across `@lisca/contracts`, two languages, and four generated
artifacts** — not a plug-in. The four shape facts an agent needs:

1. **The id set is closed.** `ASSAY_TYPE` (`packages/contracts/src/assay-ui.ts`) defines
   `gene-expression`, `immune-killing`, `lnp-binding`, `custom-assay`. The literal union in
   `assay.schema.ts` and the generated Rust enum in `crates/lisca/src/protocol/generated.rs` must agree.
2. **Unregistered ids silently alias to gene-expression.** `crates/lisca/src/analysis/assays.rs`
   dispatches `GeneExpression | LnpBinding | CustomAssay` into `gene_expression::run`. Only
   `immune-killing` has its own arm. `lnp-binding` and `custom-assay` do not lack a pipeline — they
   inherit gene-expression's, without error.
3. **The stage vocabulary is gene-expression's, and every assay must speak it.** `AnalysisStageSchema`
   (`packages/contracts/src/schema/studio.ts`) is a closed literal: `queued`, `preparing`, `segment`,
   `timeseries`, `auc`, `fit`, `completed`. It is in the wire contract. Immune-killing already
   contorts to fit — per `docs/analysis/analysis.md`, its death-times and kill-curve table report
   under the stage named `auc`. A third assay is either gene-expression-shaped or it lies about its
   own stages.
4. **`ENABLED_STUDIO_ASSAY_IDS` is the gate between schema and product.** It lists
   `gene-expression` and `immune-killing`; `choose-assay.tsx` renders all four tiles and disables the
   rest. Given (2), this gate is load-bearing — but it gates only the wizard. `assay.json` is a
   hand-editable file in an unvalidated workspace.

**`ENABLED_STUDIO_ASSAY_IDS` is the source of truth for "which assays exist today."** The landing
page is not: `apps/landing/web/src/lib/landing-content.ts` markets "Custom assay" as an available
capability, and it is disabled.

The step-by-step for adding an assay belongs in `docs/analysis/analysis.md`, not here.

## What LiSCA is not

Tiered by how settled each bound is. The tiers are not interchangeable — one is history, one is
architecture, one is unpaid debt.

### Executed — decided, and the code is already gone

**Not mobile.** `PORTING.md` records React Native / Expo / mobile being *deleted, not migrated*, in
the React 19 → SolidJS rewrite. The deletion happened: no `packages/ui-native`, no `packages/mobile-app`,
no `apps/*/mobile`, no react-native or expo dependencies. LiSCA is web + desktop. Settled.

### Structural — the architecture forecloses it

**Not a SaaS. Not multi-tenant. Not networked.** See the spine, above: only `lisca-landing` ships to
the internet, there is no database, and "auth" is a local profile switcher. This is not a gap to be
filled in later; it is the reason the Workspace is the spine.

**Nothing survives a backend restart except what was committed to the workspace.** Queue state and
task history are process-local by design; after a restart, only atomically-committed task output
remains authoritative (`.scratch/task-queue/PRD.md`). This is the filesystem-is-the-database claim
restated for background work — the rest of that PRD's Out of Scope list is feature scope for the task
queue, and stays there.

**Not general microscopy, and not single-field-of-view workflows.** LiSCA is for patterned-array
timelapse experiments — micropatterned ibidi µ-Slides and similar prepatterned labware. Users are
cell biologists and pharmacologists running those experiments.

### Pending — declared, but not yet true in the code

**Aligner and Annotator are single-page apps requiring no routes and no router.** This is a live
directive, not a description. As of this writing both still carry TanStack Router — `routes/__root.tsx`,
a generated `routeTree.gen.ts`, and `createRouter`/`createHashHistory` in `main.tsx` — to serve
exactly one route each. Studio has six (`index`, `assay`, `align`, `annotate`, `result`, `info`) and
keeps its router.

Treat the routing machinery in Aligner and Annotator as debt, not precedent.
