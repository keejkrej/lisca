# Structure cleanup

Source: a multi-agent audit of code organization (162 agents; 12 subsystem maps, 9 lenses,
46 findings each faced 3 adversarial refuters, 39 survived). Implementation issues live in
[`issues/`](./issues/). Work the **frontier**: any issue whose blockers are all `resolved`.

## Arbitration notes — read before trusting a finding

The audit is evidence, not verdict. I reviewed its output as orchestrator; four corrections
apply, and they are load-bearing.

**1. Two findings were resolved while the audit ran.** `PRODUCT.md` and the `AGENTS.md` assay
correction landed mid-audit (`af346c45`). The audit noticed `PRODUCT.md`'s absence but not its
arrival, so it reports `missing-product-doc` (high) and `docs-encode-router-as-stack-wide-default`
(low) as open. **Both are done.** No ticket.

**2. `server-crates-product-filed-domain-consumed` is rejected, despite carrying "high, refuted
0/3".** That score is a ranking artifact. The same proposal — move the library halves of
`apps/*/server` into `crates/` — was independently *rejected 2/3* under a different id
(`lisca-server-move-was-a-rename`), and the rejection's evidence was never shown to the confirmed
finding's reviewers. All three of its own reviewers downgraded it to medium in their prose while
none formally refuted it. On the merits it proposes undoing `a57e38d3` ("Move server route logic
out of lisca into per-app servers"), which was deliberate, and it contradicts `PRODUCT.md:69-73`,
which records the composition as intended product design. The report's own §4 argues the current
shape is correct. **Treat §4 as authoritative over the finding list**; the concrete alternative is
preserved under "Owner decisions" if you disagree.

**3. The audit's premise for two findings no longer holds.** Its brief stated "more assays follow
the same `assay.json` + Rust pipeline pattern" as fixed product design. That claim was false and
has been corrected — assay ids are a closed enum (`AGENTS.md`, `PRODUCT.md`). This does **not**
touch the duplication half of `assay-plot-duplication-and-false-peer-doc` (101 byte-identical
lines are still 101 byte-identical lines), but it removes the "so a third assay has a seam to sit
on" justification from that finding and from `crates-lisca-mixed-axis`. Re-argue those on
duplication grounds alone.

**4. Line numbers drift.** The audit ran across `00efea10 → af346c45`. `AGENTS.md` gained a
`## Agent skills` block that shifts citations after line 20 by +14, and has since changed again.
**Re-anchor every citation before editing.**

## Two defects the audit's lenses could not have found

Neither is a code-organization issue, which is why no lens covered them. Both are real and both
have tickets.

- **The repo's own gate has never been green.** `vp run check` fails on a clean checkout: the three
  `*-desktop#typecheck` tasks abort because `tauri.conf.json` declares `bundle.resources:
  {"resources/": ""}`, that directory is gitignored, and only `vp run dist:*` creates it. There is
  no CI (`.github/workflows` does not exist), so nothing has ever caught this. 20/23 tasks pass.
  Verified independently by me and by the audit's completeness critic.
- **Assay ids silently alias.** `crates/lisca/src/analysis/assays.rs` dispatches
  `GeneExpression | LnpBinding | CustomAssay` into `gene_expression::run`. `lnp-binding` and
  `custom-assay` do not lack a pipeline — they inherit gene-expression's, with no error.
  `assay.json` is hand-editable in an unvalidated workspace, so `ENABLED_STUDIO_ASSAY_IDS` gates
  the wizard, not the file.

## The headline

**This codebase is not overengineered and it is not fragmented.** Layering is genuinely one-way
(`packages/ui/src/features/` → `shell/` has 26 import edges; the reverse has zero). The apparent
monster `crates/lisca` (22,942 lines) is 56% machine-generated; hand-written it is 10,148 lines
across 62 files. The audit disproved two suspicions worth dropping: the task scheduler's unused DAG
is spec-driven (issues 07/08 in `.scratch/task-queue/`), and `packages/web-app`'s fusion of runtime
shell and Vite config is correct cohesion.

What is wrong is narrower: **vestigial structure from two unfinished cleanups** — the deleted React
Native tier (`PORTING.md`) and the collapse of Aligner/Annotator from multi-route to single-page
(`2c17faf7`) — plus one severed error channel and a handful of copy-vs-compose slips. Target:
**−1 package, ~−1,400 lines**, zero new packages, zero new crates.

The full audit follows verbatim.

---

# LiSCA Structural Audit

> **Anchoring note.** The tree moved during this audit. HEAD advanced `00efea10 → e74ad1d6`; `AGENTS.md` gained a 14-line `## Agent skills` block that shifts every citation after line 20 by **+14** (the TanStack Router line is now `AGENTS.md:39`, the client-IO rule `AGENTS.md:40`, the contracts rule `AGENTS.md:48`); `docs/agents/` and a root `PRODUCT.md` appear to have landed. Findings below cite the line numbers as read. Re-anchor before editing.

---

## 1. Verdict

**This codebase is healthy and unusually well-factored. It is not overengineered, and it is not fragmented.** The domain slicing is right, the layering is genuinely one-way (`packages/ui/src/features/` → `shell/` has 26 import edges; `shell/` → `features/` has **zero**), the contract pipeline is disciplined, and the biggest apparent monster — `crates/lisca` at 22,942 lines — is 56% machine-generated (`crates/lisca/src/protocol/generated.rs`, 12,794 lines from `cargo typify`). Hand-written `crates/lisca` is 10,148 lines across 62 files.

What is actually wrong is narrower and more specific than "too many packages": **one severed error channel that silently degrades every user-facing failure message**, and **a large deposit of vestigial structure from two events the repo has not finished cleaning up after** — the deleted React Native tier (`PORTING.md:991`) and the collapse of Aligner/Annotator from multi-route to single-page (`2c17faf7`). Almost every confirmed finding traces to one of those two, plus a handful of copy-vs-compose slips in `packages/client/src/ports/` and `packages/client/src/atoms/`.

Two things the audit disproved and you should stop worrying about: the task scheduler's unused DAG is **spec-driven, not speculative** (`.scratch/task-queue/PRD.md`; issues 07/08 are `ready-for-agent`), and `packages/web-app`'s fusion of runtime shell + Vite config is **correct cohesion**, not two packages fused — all three product apps consume all four of its entries.

---

## 2. The target structure

The tree a from-scratch rewrite would produce today. Deltas marked; everything unmarked stays as-is.

```
apps/
  aligner/
    web/            SPA. No routes/, no routeTree.gen.ts, no @tanstack/*.   [−4 files, −2 deps]
    demo/           Library entry (src/index.ts) + a 3-line dev preview.    [−4 files, −2 deps]
    desktop/        13-line Tauri shim over lisca-tauri.
    server/         lib (align routes + crop job book) + bin. Keep as-is.
  annotator/        Same shape as aligner, same deltas.
  studio/
    web/            6 routes. The ONLY app that constructs a router.        [+ result/ absorbs the chart renderer]
    desktop/        13-line Tauri shim.
    server/         Superset binary; path-deps aligner-server + annotator-server (documented design).
  landing/web/      3 routes, browser history, its own vite config. Unchanged.
packages/
  contracts/        Effect Schema + HttpApi → TS types, openapi.json, Rust typify. Source of truth.
  utils/            Pure, framework-free logic.  [+ storage.ts, + the 5 Solid-free ui-headless modules]
  client/           Ports, atoms, session, hooks. ONE DI mechanism (the Layer). ONE port construction path.
  ui-headless/      Solid-coupled headless state ONLY. ~19 modules.         [−5 modules, −contrast-control]
  ui/               Solid + Tailwind + Kobalte.                             [−@observablehq/plot, −@lisca/analysis, −route props]
  smart/            ONNX browser/request providers. Unchanged.
  web-app/          Provider stack + vite factory + CSS. Router-free; takes a root component.
  web-demo/         Demo atoms/hooks/browser imaging.                       [−createLiscaDemoApp router factory]
  storage/          DELETED — 70 lines dead, 75 live lines fold into utils.
  analysis/         OWNER DECISION — single-consumer once the chart renderer moves.
crates/
  lisca/            Domain + mechanism.  [+ onnx.rs; analysis/ fully studio-gated]
  lisca-server/     TaskScheduler + task_router.  [−KeyedRuns, once analysis migrates]
  lisca-tauri/      ProductConfig + run(). Model of a correct shared crate.
python/             Standalone training CLI. Manual ONNX handoff via models/.
```

Net: **−1 package**, ~**−1,400 lines**, zero new packages, zero new crates.

---

## 3. What to change

### A. The error channel is severed at the Promise boundary — every failure message users see is the wrong one

**This is the only finding in the report with a live user-visible defect, and it is a one-function fix.**

`packages/client/src/infra/runtime.ts:11-16` uses bare `Effect.runPromise`, which rejects with a `FiberFailureImpl` **wrapper**, not the failure value. Verified by execution against the repo's pinned `effect` version, through the real path: the caught value satisfies `instanceof ClientError === false`, `instanceof TaskCommandError === false`, `instanceof TypeError === false`; `_tag`, `code`, `currentStatus`, `.cause` are all `undefined`. Only `.message` survives — and it is Effect's rendering, not the original.

Consequence, at all 35 `runClientEffect` call sites routed through `packages/client/src/infra/port-core.ts:51` → `toFetchErrorMessage`:

- `packages/client/src/infra/errors.ts:19` `cause instanceof ClientError` never fires → the recursion at `:20-21` and the message handling at `:23-29` are **dead code**.
- `errors.ts:33` `cause instanceof TypeError` never fires → **"server unreachable at {addr}"** (`errors.ts:38`) never renders.
- `errors.ts:25-27` "Ensure the Rust backend is running (e.g. `vp run dev:aligner`)" never renders.
- `errors.ts:34-36`'s string guards (`"Failed to fetch"` / `"NetworkError"` / `"fetch failed"`) don't match, because FiberFailure's message is Effect's own.

**Measured today:** users get `"Scan failed: Transport error (GET http://127.0.0.1:8765/tasks/operations)"` where the code intends `"Scan failed: server unreachable at http://127.0.0.1:8765"`. Backend-not-running is the #1 failure mode for a desktop app that spawns its own server (`apps/aligner/desktop/src-tauri/src/main.rs:7-9`), and its dedicated guidance has never rendered. Affected sites include `use-align-session.ts:406-407, :470, :522, :578, :601`; `use-annotate-state-core.ts:308, :329`; `use-studio-annotate-state.ts:208-210`; `result-page.tsx:155`; `frame-loader.ts:77`.

**Move.** Make `runClientEffect` reject with the failure value: `Effect.runPromiseExit` + `Exit.match` rethrowing `Cause.squash(cause)`, or `Effect.catchAll(effect, (e) => Effect.promise(() => Promise.reject(e)))`. **Zero changes at the 35 call sites.** Add a regression test asserting `toFetchErrorMessage(caught, …) === "…: server unreachable at …"` for a fetch `TypeError` routed through `runClientEffect`.

**Free byproduct:** `error instanceof TaskCommandError` starts working, which retroactively earns `withTaskCommandEffect` (`packages/client/src/ports/tasks.ts:26-37`) and its type params at `ports/types.ts:53-55`. **Do not delete them** — with the fix in place, `packages/ui/src/shell/task-center/task-center.tsx:49-55`'s duck-typed `errorMessage(unknown)` becomes replaceable with a real `_tag === "TaskCommandError"` branch keying on `code`/`currentStatus`, if you want conflict-vs-offline UX. That's optional; the fix above is not.

> Note `packages/client/test/task-port.test.ts:134-158` asserts `toBeInstanceOf(TaskCommandError)` via `Effect.flip` — the sole observation site is the sole site that never crosses `runClientEffect`. It is a **false assurance** today; after the fix it becomes an honest one.

---

### B. Routing: one shared seam, four apps, ~350 lines of ceremony

Your directive is correct and the code proves it. Aligner and Annotator (web **and** demo — four builds, not two) each carry a full TanStack Router for exactly one route.

**The evidence is total, not partial:**
- `apps/aligner/web/src/routeTree.gen.ts:32` types `fullPaths: '/'`. All four generated trees are **byte-identical** (md5 `35106a1a1a22e9b4daae54b6fc33c13c`, 59 lines each), all git-tracked, none gitignored.
- `apps/aligner/web/src/routes/__root.tsx` is byte-identical to `apps/annotator/web/src/routes/__root.tsx`: `RootLayout` returns bare `<Outlet />` (`:9`), `NotFound` returns `<Navigate replace to="/" />` (`:13`) — a 404 handler whose only destination is the app's only route, cleaning up after a router that is the sole reason 404s are reachable.
- Exhaustive grep over `apps/aligner` + `apps/annotator` for `useNavigate|<Link|useRouter|useParams|useSearch|useMatch|useBlocker|useRouterState|useLoaderData|redirect\(|validateSearch|beforeLoad|loader:` returns **zero**.
- No URL state: `packages/utils/src/server.ts:188` reads `?liscaHttp=` via raw `URLSearchParams` (`packages/client/src/infra/urls.ts:4`), and `main.tsx:8` uses `createHashHistory()` — the router owns `#/`, the one piece of real URL state lives in the search string. **Disjoint parts of the URL. The router owns nothing.**
- No shared package needs router context: `packages/ui` contains **zero** `@tanstack/solid-router` imports.
- History: `6956d8ed` shows aligner once had `align.tsx` / `index.tsx` / `roi.tsx`; `2c17faf7` dropped the second route. `PORTING.md:544-612` §6 "Router Migration (TanStack)" then translated the residue verbatim rather than questioning it. Textbook "would not exist if rewritten today."

**Three seams enforce it. All three must change before any route file can go:**

| Seam | Why it blocks |
|---|---|
| `packages/web-app/src/create-lisca-web-app.tsx:8` | `router: AnyRouter` is required; `:38` renders `<RouterProvider>` unconditionally |
| `packages/web-demo/src/create-lisca-demo-app.tsx:7` | Same required field; `:24` same unconditional render. Both its consumers are single-route. |
| `packages/web-app/vite.ts:152` | `tanstackRouter({ target: "solid", autoCodeSplitting: true })` applied unconditionally to 5 consumers (3 web apps + both demos via `packages/web-demo/vite.ts:4`) |

**Move.**

1. **Replace, don't make optional.** Change `LiscaWebAppConfig.router: AnyRouter` to a root-component slot (`App: Component`). Studio passes `() => <RouterProvider router={router} />` — a ~2-line change in `apps/studio/web/src/main.tsx`. One uniform mode, no branching, and `@tanstack/solid-router` + `@tanstack/router-plugin` leave `packages/web-app` entirely. An optional field with a `children` fallback is a lateral move — `create-lisca-demo-app.tsx:9` already has exactly that dead `children?: JSX.Element` slot and no caller uses it.
2. **Delete `packages/web-demo/src/create-lisca-demo-app.tsx`.** With the router gone it is a ~10-line `render()` with two 3-line callers. Inline it. Do not merge it into `createLiscaWebApp` — that factory exists to supply the Atoms/Server/Workspace provider stack the demos deliberately lack.
3. **Vite:** prefer `createLiscaViteConfig({ port, plugins?: PluginOption[] })` over a boolean, and let Studio pass `[tanstackRouter(…)]` — mirroring what `apps/landing/web/vite.config.ts:26` already does. `@tanstack/router-plugin` then leaves the shared package too. `scripts/lisca-dev.test.ts:158-171` is the only test touching this factory and asserts `server.proxy` only — nothing blocks it.
4. **Then delete**, in all four apps: `src/routes/` (8 files), `routeTree.gen.ts` (4 files, 236 lines), the `createRouter`/`createHashHistory`/`declare module … Register` block in each `main.tsx`. Drop `@tanstack/solid-router` from `apps/aligner/web/package.json:22`, `apps/annotator/web/package.json:23`, and both demo manifests. `@tanstack/router-plugin` at `apps/aligner/web/package.json:29` / `apps/annotator/web/package.json:31` / `packages/web-demo/package.json:42` is **already** an unused declaration — those apps' 3-line vite configs never import it. Drop those independently, today.

**Corrections to fold in:** `apps/landing/web` does **not** call `createLiscaWebApp` (it hand-rolls `render()` at `src/main.tsx:19-26`) and does **not** call `createLiscaViteConfig`. It is not a consumer of either seam and is unaffected. `@tanstack/solid-router` cannot leave the workspace — Studio (6 routes) and Landing (3, plus `<Link>` at `apps/landing/web/src/components/demo-embed.tsx:22`) genuinely need it.

#### B2. `ShellNavbar` carries a route switcher that is unreachable repo-wide — land this first, independently

`packages/ui/src/shell/chrome/navbar.tsx:19-21` makes `routeItems` / `routeValue` / `onRouteChange` **required** props. The render guard at `:72` is `showRouteToggle !== false && props.routeItems.length > 1`. Both presets fail it on **both** clauses: `ShellNavbar.Aligner` (`:138-144`) hard-codes a 1-element array + `showRouteToggle={false}` + `onRouteChange={() => undefined}`; `ShellNavbar.Annotator` (`:118-123`) does the identical thing. The ToggleGroup at `:76-92` is unreachable everywhere. `packages/ui` is `"private": true`, so there is no external-API argument.

Not built for a consumer that never adopted it — it was **live** at `54fd85e4` (aligner passed `[{align},{inspect}]` with `onRouteChange={(v) => navigate({to: '/'+v})}`); `2c17faf7` collapsed both arrays to length 1 and the required props were never cleaned up.

**Move:** delete `ShellNavbarRouteItem` (`:13-16`), the four route props (`:19-23`), the branch (`:71-94`); simplify both presets; drop the type re-export at `packages/ui/src/shell/index.ts:15`. **Two implementation caveats:** (a) keep the `<div />` middle-column spacer, or change `grid-cols-[1fr_auto_1fr]` at `:51` — otherwise the right-hand cluster lands in the wrong column; (b) `ToggleGroup` the primitive stays (used by `annotation-mode-toggle.tsx` and `align-grid-shape-toggle.tsx`) — only the import at `navbar.tsx:7` goes, and narrow `:4` to `import { Show }` since `For` is only used in the deleted branch.

#### B3. The demo standalone sites

`scripts/demo-standalone-build.ts:6` exits early unless `LISCA_BUILD_DEMO_SITE=1`, set **nowhere** in the repo. Root build (`package.json:37`) filters `./packages/*` and `@lisca/*-web` — `@lisca/aligner-demo` matches neither. `scripts/deploy-landing.ts:64` builds only landing. Landing imports the components directly (`apps/landing/web/src/lib/demos.ts:1-2`, `src/routes/aligner-demo/index.tsx:1`, `src/components/demo-embed.tsx:37 <Demo embedded />`) and never touches the demo routers — **direct proof the demo routers are pure wrappers.**

Two live entry points remain: `vp dev` (`apps/aligner/demo/package.json:13`) is a working manual preview — keep it, shrink its entry to `render(() => <ShellThemeProvider><AlignDemo /></ShellThemeProvider>, …)`. And `typecheck` is invoked by root `check` (`package.json:45,53` use `vp run -r`), which is why the router currently typechecks itself on every CI run.

---

### C. The deleted React Native tier left its seams behind — pure deletion, no risk

`PORTING.md:988-993` deleted `packages/ui-native`, `packages/mobile-app`, `apps/{aligner,annotator,studio}/mobile`. Verified gone from disk; a quoted grep for `react-native`/`expo`/`nativewind`/`@shopify/react-native-skia` across every non-`node_modules` `package.json` returns **zero**. Five seams outlived their only consumer:

| What | Where | Proof it's dead |
|---|---|---|
| AsyncStorage bridge | `packages/storage/src/index.ts:7-12`, `:81-145` (~70 lines) | `NativeStorageBackend` is AsyncStorage's exact async shape behind a **sync** adapter (`:1-5`). Zero callers repo-wide. Single commit `f28d55e1` "Replace WebView mobile shells with native Expo clients" — never touched since. No `tauri-plugin-store` exists; all three `apps/*/desktop/package.json` have empty deps. |
| Chart platform matrix | `packages/analysis/src/charts/capabilities.ts` (50 lines) | `ChartPlatform = "web" \| "native"` (`:4`). `PANEL_RENDER_CAPABILITIES` (`:6-19`) — the `web` and `native` rows are **byte-identical and all-`true`**. `panelKind` (`:21`), `isChartSpecKindSupportedOn` (`:36`), `unsupportedPanelLabel` (`:48`) have zero refs anywhere. `isPanelRenderableOn` (`:32`) / `filterRenderablePanels` (`:41`) only from its own test. Origin `0e468125`, alongside `apps/studio/mobile/src/result/native-charts.tsx` (Victory Native on Skia). |
| Victory token | `packages/analysis/src/charts/theme.ts:29` `VICTORY_DOMAIN_PADDING` | Victory is a React lib; the renderer is `@observablehq/plot`. Zero consumers. |
| `batch` injection | `packages/ui-headless/src/canvas-resource-transaction.ts:9-14` + the 11-line wrapper `packages/ui/src/features/canvas/canvas-resource-transaction.ts` | Git-proven: at `f26f0890^`, `packages/ui` passed `batch: unstable_batchedUpdates` (react-dom) while `packages/ui-native` took the identity default. **Two React renderers batched differently.** Solid's `batch` is universal and `solid-js` is already a `peerDependency` of ui-headless. No test covers this module. |
| Headless `ContrastControl` | `packages/ui-headless/src/contrast-control.ts` | Zero production consumers — only its own test. `packages/ui/src/features/contrast/contrast-control.tsx:34-51` **re-derives** the same state from `@lisca/utils` instead of wrapping it, so the two can drift silently. All 6 call sites import ui's. |

**Move.**
- Delete `packages/analysis/src/charts/capabilities.ts`, drop `export * from "./capabilities"` at `charts/index.ts:1`, delete the **entire** `describe("capabilities")` block at `packages/analysis/test/charts/chart-spec.test.ts:71-77` **and** the two now-unused imports at `:6-7` (removing only the assertions leaves an empty `it()` and dangling imports). Delete `VICTORY_DOMAIN_PADDING`. Update `docs/analysis/analysis.md:16` (drop "renderers", plural) and delete the `:21` capabilities bullet.
- Delete `packages/storage/src/index.ts:7-12` and `:81-145`. (Fold the live remainder → §G2.)
- `canvas-resource-transaction.ts` imports `batch` from `solid-js` directly like its 8 siblings; delete the ui wrapper and re-point `packages/ui/src/features/index.ts:79-81` at the headless module.
- Delete `packages/ui-headless/src/contrast-control.ts`, its test, its package.json export block, and its `src/index.ts:7` barrel line — **or** rewire the `.tsx` to consume it. Do not "move" it; the destination is occupied by the live implementation. Either way fix `docs/ui/ui-package-layout.md:36`, which asserts a wrapping relationship that does not exist, and the `ContrastControl` exemplar citation at `:25`.

---

### D. Copy-vs-compose: Studio copies exactly what it also composes

Three instances of the same slip, all verified by machine diff, all mechanical to fix.

**D1. The port layer.** `packages/client/src/ports/studio.ts:25-30` spreads `createAlignerPort` and `createAnalysisPort` — then `:56-94` hand-writes Annotator's 7 methods, **byte-identical** to `annotator.ts:32-70` (`diff` exits empty). `types.ts:136` mirrors it, re-declaring 7 signatures already on `AnnotatorDataPort` (`types.ts:64-94`). Meanwhile `apps/studio/server/src/main.rs:38-40` merges `annotator_server::router()` — **the same product composes Annotator on one side of the wire and copies it on the other.**

No historical excuse: at `385d30ad` (the commit that introduced the copy), `createAnnotatorPort` already had the injectable-client signature. Studio is *already* contractually an Annotator superset — `use-studio-annotate-state.ts:68` passes `studioClient` into `use-annotate-state-core.ts:63`, which demands `AnnotatorDataPort`. The `contrast` drift (`types.ts:76` required vs `:151` optional) is inert (both impls are `contrast ?? null`) but is the fingerprint that only a copy produces.

**Move (verified end-to-end by a reviewer — typecheck clean, 99/99 tests pass):** import `createAnnotatorPort`, spread it, delete `studio.ts:56-94`, and reduce the type to `AlignerDataPort & AnnotatorDataPort & AnalysisDataPort & StudioHostPort & { getAnalysisResults, getLatestAnalysisProgress }`. Do **not** re-list `readTextFile`/`saveAssayJson`/`saveResultPdf` — `StudioHostPort` already declares them (`types.ts:58-62`). Also remove the then-unused `decodeFramePayload` import at `studio.ts:1`. `packages/client/test/studio-port.test.ts:6-18` exists only to guard this copy and becomes redundant.

**D2. The atoms layer — the fix is demonstrated one line above the copy.** `packages/client/src/atoms/studio/queries.ts:38` calls the tag-parameterized `createSourceQueryAtoms(runtime, StudioPortService)` for the align atom — then `:40-83` hand-copies 4 annotate atoms, identical to `annotator/queries.ts:49-92` after a tag rename. Plus `:19-34` vs `annotator/queries.ts:28-43` — 16 lines of **byte-identical** type declarations, no rename needed. `source-queries.ts:20-21` even documents the intent: *"The aligner and studio runtimes share one definition."* The copy landed `385d30ad`, **five days after** `source-queries.ts` existed (`8aca7068`), in a commit that *also* added the `import type … from "../annotator/queries"` line — the author was reading the file they were copying. Six commits since have edited both in lockstep.

**Move:** add `atoms/annotate-queries.ts` beside `source-queries.ts` exporting `AnnotateQueryPort` (structural: `scanRoiWorkspace`/`loadLabels`/`saveLabels`/`saveRoiFrameAnnotation`, mirroring `SourceQueryPort` at `source-queries.ts:11-13`), the `SaveAnnotationLabelsInput`/`SaveRoiFrameAnnotationInput` types, and `createAnnotateQueryAtoms<Id, Port extends AnnotateQueryPort>(runtime, PortTag)`. **The types must move too** — leave them in `annotator/queries.ts` and the backwards studio→annotator dep survives the refactor. A reviewer implemented this: client + annotator-web + studio-web typecheck clean, 99/99 tests pass. `StudioDataPort extends AnnotatorDataPort` makes it type-feasible.

**D3. Align canvas pointer arbitration, copied 3×.** `apps/aligner/web/src/components/aligner-main.tsx:18-54` and `apps/studio/web/src/components/studio-align-main.tsx:36-72` are **37 byte-identical lines**; `apps/aligner/demo/src/components/demo-align-main.tsx:30-49` differs by one line (the state accessor). The `cursor` derivation is also triplicated (`aligner:91-95`, `studio:112-116`, `demo:76-83`), as is the `previewRedrawRef` + `onPreviewGridChange` wiring.

The repo already solves this for the annotate canvas: `packages/ui-headless/src/annotation-canvas-handlers.ts:233-242` is a single hook returning merged dispatchers + cursor, and `apps/annotator/web/src/components/annotator-main.tsx` does zero arbitration. **Align is the outlier against your own convention.** The boolean returns on `packages/ui-headless/src/align-selection-handlers.ts:52,72,83` exist *solely* to drive this arbitration and have no other consumer — the shared package committed to the composition and stopped one step short.

**Move:** `useAlignCanvasPointerHandlers(options)` in `packages/ui-headless/src/` (where both composed hooks live; `packages/ui/src/features/align/align-canvas-handlers.ts` is a 12-line re-export shim). Return the four dispatchers, `dragging()`, `selecting()`, `previewGridRef` (all three call sites pass it to `<AlignCanvas>`), and `cursor`. **Drop the dead branch** while consolidating: all three sites bind `enabled: manualExclusionEnabled`, and `align-selection-handlers.ts:55` returns `false` when `!enabled`, so the "selection gets first refusal" branch at `aligner-main.tsx:40` is structurally unreachable. The real rule is just "manual exclusion → selection, else grid." Keep the individual hooks exported (`packages/ui-headless/test/align-canvas-handlers.test.ts:5` uses the grid hook standalone).

**D4. `withClientEffect` ×5.** Identical bodies at `ports/aligner.ts:18`, `annotator.ts:14`, `studio.ts:15`, `tasks.ts:18`, `host.ts:17`. Hoist into `infra/`. Independent, trivial.

---

### E. Dead surface — the long tail (all trivial, all pure deletion)

| What | Where | Note |
|---|---|---|
| `LiscaApiClientService` + `apiClientLayer` | `packages/client/src/infra/api-client.ts:37-45` | Zero consumers; `api-client.ts` has **no subpath** in the 46-entry export map, so unreachable from outside the package. Also narrow `:3` to `import { Effect, Layer }` — `Context` becomes unused; `Layer` stays for `fetchLayerFor` (`:14-18`), which is a **real** two-implementation seam and stays. |
| Port registry | `packages/client/src/infra/port-registry.ts` | `@deprecated` by its own author at `:8` — *"port registry duplicates atom runtime DI"* — yet `port-core.ts:40` puts it on the live path for all three apps. The `overrides` Map (`:11-12`) is keyed by a closure-local, never-exported Symbol → holds at most one entry → an over-engineered `let`. `read()` (`:15-20`) can never return undefined → `ensure()`'s `throw new Error("Port is not available")` (`:24`) is **unreachable**. Lazy construction is defeated: all three apps call `port.ensure()` at module scope. |
| Per-app port re-exports | `apps/{aligner,annotator,studio}/web/src/api/*-port.ts:16-21` | Normalized diff on both pairs returns **empty** — one 30-line file three times, varying only in product name and port (8765/8766/8767). `*PortRegistry`, `read*Port`, `set*PortForTests`, `reset*PortForTests` = **12 dead exports**. The test seams are dead in all three apps, including the two that *have* tests (`apps/annotator/web/test/annotator-header.test.tsx` uses `vi.mock` instead). |
| Dead vendor primitives | `packages/ui/src/components/ui/dropdown-menu.tsx` (317 lines, 15 exports), `card.tsx` (93 lines, 7 exports) | Zero consumers. Backing CSS at `packages/ui/theme.css:145-162` and `:287-317` dies with them. |
| Dead hook dir | `packages/ui/src/hooks/` | `useLatest` has zero consumers anywhere. The `./hooks` export subpath (`packages/ui/package.json:29-32`) serves this dead directory alone. |
| Dead shell exports | `packages/ui/src/shell/chrome/stat-tile.tsx`; `ShellDock`/`ShellSidebar` (`shell/layout/shell.tsx:232,:237`); `ShellNavbar.Leading`/`.Actions` (`navbar.tsx:149-155`) | Zero consumers. |
| Dead + **broken** probe hook | `packages/ui/src/shell/server/use-shell-http-probe.ts` + `shell/index.ts:54` | Zero consumers. Also broken: `:18` takes `httpBaseUrl: string` (not an accessor) read at `:23` inside `createEffect`, so it can never react to URL changes. A failed React→Solid port artifact. |
| Degenerate predicates | `packages/ui-headless/src/canvas-status.ts:3-9` | Both ignore their argument and return hard-coded `false`. `shouldShowLoadingIcon` has zero callers. `shouldHideToastText`'s one caller (`packages/ui/src/features/canvas/canvas-status.tsx:5,:84`) has unreachable branches at `:89-91,:94,:98`. `packages/ui-headless/test/canvas-status.test.ts:11-19` asserts `toBe(false)` six times — **a green test proving the code does nothing.** |
| Vestigial bridge | `packages/client/src/session/studio-annotate-session-bridge.ts` (41 lines) | All identity functions now that `annotator-ui.ts:209` is generic. Public subpath, zero production importers. |
| Dead param / branch | `packages/client/src/session/frame-load-policy.ts:5-11` (`kind` never read); `packages/client/src/session/work-session.ts:150` (both ternary arms identical) | |
| Unused injection seam | `packages/client/src/atoms/studio-ui.ts:132-135` | `createStudioUi(adapters = {…})` — all 4 call sites pass nothing, forcing `STUDIO_SESSION_KEY`/`studioWizardAtom`/`studioWizardActions` to be returned values (`:511-522`) that `studio-store.ts` destructures back to module scope. |
| Dead studio components | `apps/studio/web/src/components/studio-crop-progress-modal.tsx` (imported by zero files); `studio-result-expert-right.tsx:61-64` (`switchSection` dispatches `CustomEvent('studio-result-section')` — **no listener exists anywhere**, buttons are inert) | |
| Orphan assets | `apps/studio/web/src/assets/` — 6 files, ~102KB | `basic-info-step1.tsx:41-46` declares `FEATURES` with matching ids but renders text labels. |
| Phantom deps | `apps/aligner/web/package.json:17,19` (`@lisca/storage`, `@lisca/ui-headless`); `apps/annotator/web/package.json:18,20` (same); `packages/web-app/package.json:32` (`@lisca/contracts`); `packages/web-demo/package.json:36` (`@lisca/smart`), `:42` (`@tanstack/router-plugin`); `apps/studio/web/package.json:25` (`effect`) | Zero imports each. Safe: `packages/ui` declares `@lisca/ui-headless` itself, and no `paths` mapping exists in `tsconfig.base.json`, so resolution goes through the declaring package. |

---

### F. Rust

**F1. Two latent wire bugs in Studio's profile/memory surface.** Both are unconsumed today (`/memory/touch`, `/profile/*` have zero client callers; Studio's recents are localStorage via `packages/client/src/studio/wizard-memory.ts:52`), so fix them cheaply or delete the surface — but do not leave them.

- **`civil_from_days` is a mis-transcribed calendar algorithm.** `crates/lisca/src/profile/store.rs:59-70`. Four errors: `:61` era divisor `40_600` (correct: 146,097) + negative guard `z - 1_461` (correct: `z - 146_096`); `:62` same divisor; `:63` omits `+ doe/36524 - doe/146096`; `:69` omits the mandatory `y + (m <= 2)`. **Verified by executing the exact repo arithmetic:** days=0 → `6880-04-18`; days=20650 → `7225-09-04`; days=19782 → `7223-04-20`. Isolation testing shows only the `:69` omission causes the ordering defect: exactly **1 backward roll per year**, a contiguous ~59-day Jan–Feb window (not 4×/year) in which `store.rs:283/:302/:328`'s `sort_by` demotes just-touched entries below stale ones.
  **Move:** delete `now_iso8601` (`:42-57`) and `civil_from_days` (`:59-70`); store epoch millis from the already-imported `std::time` (mirroring `createdAtMs: U64` at `packages/contracts/src/schema/tasks.ts:54` and the numeric sort at `packages/ui-headless/src/task-center.ts:61`). **Also delete the three `sort_by` calls** — `touch_memory` already does `retain` + `insert(0, …)` and Rust's sort is stable, so with any correct key the sort is a guaranteed no-op; it only ever *breaks* order. Note `chrono` is **not** free: it reaches `lisca` only via the optional `studio → mplot → plotters` chain, so `apps/{aligner,annotator}/server/Cargo.toml:22` (`default-features = false`) would gain a compile unit. Epoch millis avoids that entirely.

- **`MemoryTouchBody` is hand-written and already wrong.** `crates/lisca/src/profile/store.rs:243-259` uses `#[serde(tag = "kind", rename_all = "camelCase")]`, which renames **variants**, not fields (that needs `rename_all_fields`). Verified against pinned serde 1.0.228: the contract's `assayLabel`/`workspacePath` (`packages/contracts/src/schema/memory.ts:38-40`) silently deserialize to `None`. `AGENTS.md:48` says *"Never hand-write wire types."*
  **Cause (the obvious diagnosis is wrong):** it is **not** the `if (normalized.definitions.AlignerSource)` hardcoding at `gen-rust-schema.ts:107-112`. `OpenApi.fromApi(liscaApi)` never emits a `MemoryTouchRequest` component at all — Effect **inlines** top-level union payloads into `requestBody.content`, and `gen-rust-schema.ts:34-36` harvests only `components.schemas`. Generalizing the normalizer fixes nothing.
  **Move:** add `foldDefs(MemoryTouchRequestSchema)` alongside `gen-rust-schema.ts:47-51` — `JSONSchema.make` **does** emit a flat 3-member `anyOf` under `$defs.MemoryTouchRequest`, exactly the shape the existing normalizer handles. Then delete `MemoryTouchBody`. **Add the guard that would have caught this:** fail the generator when an `identifier`-annotated schema produces no definition. Separately, un-delete `RequestError` at `gen-rust-schema.ts:119` (it is LiSCA-authored at `http-api.ts:80`, unlike the HttpApi-internal envelopes it is grouped with) and have `crates/lisca/src/http/auth.rs:32` / `error.rs:29` serialize the generated `Unauthorized`/`RequestError` structs instead of `json!` literals — `generated.rs:5904` already emits `Unauthorized` and it is dead.

**F2. The ONNX ResNet18-224 classifier is implemented twice.** `crates/lisca/src/smart/exclude.rs` (occupied/empty) and `crates/lisca/src/analysis/assays/immune_killing/predict.rs` (dead/alive) share, near-verbatim: `binary_logits` (`exclude.rs:152-162` vs `predict.rs:107-117`, identical but for the error string), the stabilised softmax (`:146-149` vs `:120-125`), `resize_to_224` (`:208-214` vs `:88-92`), `to_nchw_normalized` (`:295-306` vs `:94-105`), the logits-output-name fallback (`:134-139` vs `:189-194`), `IMAGE_SIZE`/`IMAGENET_MEAN`/`IMAGENET_STD` (3×, adding `segment.rs:17-18`), `workspace_models_dir` (verbatim at `exclude.rs:68-70` and `segment.rs:129-131`, inlined at `immune_killing.rs:34`), and the env-var prelude of model resolution (`immune_killing.rs:15-30` == `exclude.rs:82-97`).

**The feature-gate excuse is false** — `Cargo.toml:15` declares `studio = ["smart", …]`, so `smart` is enabled whenever `predict.rs` compiles. Nothing prevented sharing. `54b54092` fixed a production panic ("proxy 502 decode errors in Studio") by introducing `binary_logits`; `518afeaf` copied the post-fix code two days later — including two match arms that are unreachable in `predict.rs`. **Copy-pasted knowledge of a non-obvious ONNX export quirk.**

**Move:** `crates/lisca/src/onnx.rs`, peer to `tiff_io.rs`, gated `#[cfg(feature = "smart")]`, owning the constants, `binary_logits`, the softmax, `resize_to_224`, `to_nchw_normalized`, `workspace_models_dir`, and `resolve_model_path(env_var, extra_candidates)` for **the two `model.onnx`-shaped resolvers only**. `segment.rs:100-127` is a different shape (two quantized files, `has_segment_models` predicate, no parent-of-`model.onnx` branch) — it shares only `workspace_models_dir` and the constants. Leave at each call site what genuinely differs: session lifetime (OnceLock vs per-run), batching (1 vs 256), input-name discovery, and — critically — **label semantics, which are opposite** (`exclude` index 0 = exclude; `predict` index 0 = absent per `predict.rs:119`).

**F3. 101 byte-identical plotting lines, directly above the shared seam both already import.** `crates/lisca/src/analysis/assays/gene_expression/plot/timeseries.rs:74-174` and `immune_killing/plot/timeseries.rs:46-146` are byte-identical — and that is **two** functions, `write_metric_plots` **and** `write_subplot_grid`. `analysis/plot.rs:1` already declares itself *"Shared plotting helpers used across assay pipelines"*, and `immune_killing/plot/timeseries.rs:7-11` already imports **ten** helpers from it. The lockstep cost is real: `f8a5cc85` changed `percentile_ylim(…)` → `percentile_ylim(…, 1.0)` in both copies in one commit.

Separately, `immune_killing/plot/timeseries.rs:6` imports `discover_timeseries_csvs`/`load_trace_panel`/`TracePanel` from `gene_expression` — making it a de-facto base module against `assays.rs:1-2`'s peer framing. All three are assay-neutral (`traces.rs:23-75` is parameterized by `y_column`); `build_fit_tasks` (`traces.rs:77`) hardcodes `"corrected"` and stays.

**Move:** both functions → `analysis/plot.rs` (the layering objection doesn't apply — `analysis/plot/util.rs:5` already imports `crate::analysis::slide::SlideMapping`). `discover_timeseries_csvs`, `load_trace_panel`, `group_timeseries_rows`, `TracePanel` → a neutral `analysis/timeseries.rs` (precedent: `analysis/slide.rs`, `csv_io.rs`, `roi_stack.rs`). Delete `gene_expression::run_sync` (`:164`) — zero callers, replays the async `run` (`:35`) step-for-step. **Drop the `#[allow(dead_code)]` argument from any writeup:** it is a no-op — `run_sync` is `pub` on a fully-public path (`lib.rs:10 → analysis.rs:6 → assays.rs:4`), so rustc never lints it. Nothing in the current lint config could have caught this. (Code moved into the private `mod plot` **would** become dead-code-linted — a real secondary benefit.) Also note `assays.rs:24-26` already routes `LnpBinding` and `CustomAssay` to `gene_expression::run` — "the third assay" is already here.

**F4. `crop_roi` is a second, CLI-only concurrency engine behind a doc comment that says otherwise.** `crates/lisca/src/aligner/crop.rs:101` `crop_roi` has exactly one caller workspace-wide: `crates/lisca/src/bin/lisca-crop.rs:321`. `a47fab8b` migrated the server onto `crop_roi_position` (`routes.rs:245`), silently falsifying `lisca-crop.rs:3` — *"Uses the same `aligner::crop_roi` path as the aligner/studio servers."* Dead subtree (~305 code lines + ~24 test lines): `:101` `crop_roi`, `:280` `CropPositionEvent`, `:288` `set_active_position_progress`, `:306` `record_pages_written`, `:389` `CropJobQueue`, `:391` `crop_position_worker`, **`:450` `crop_position_frame_major`** (reachable only from `crop_position_worker:424`), `:628` `crop_position_worker_count` + `LISCA_CROP_MAX_WORKERS`.

**Move:** **do not** route the CLI through the scheduler — `crates/lisca-server/Cargo.toml:14` declares `lisca.workspace = true`, and `lisca-crop` is a bin of `lisca`, so that is a cargo-rejected cycle. **Do not** serialize it — `--workers N` is the tool's purpose. **Move the worker pool into `src/bin/lisca-crop.rs`**, leaving `crop_roi_position` as the library's one entry point, and drop the `crop_roi` re-export at `aligner.rs:7`. Then rewrite `lisca-crop.rs:3` to say what is true: a benchmark harness sharing the per-position primitive (`crop_position_atomic:478`) but not the server's scheduling. **Drop the "halves annotator's compile" claim** — `pub mod aligner;` (`lib.rs:7`) is ungated, so annotator still compiles ~500 remaining lines of `crop.rs`. That's a separate feature-gate question.

**F5. Cargo table hygiene.** `crates/lisca-tauri/Cargo.toml:3-5` and all three `apps/*/desktop/src-tauri/Cargo.toml:3-5` hardcode `version`/`edition`/`license` instead of inheriting from `[workspace.package]` (root `Cargo.toml:15-19`); none declares `repository`. Three path deps bypass `[workspace.dependencies]` (`:55-56`): `lisca-tauri` (a four-level relative path repeated 3×, sitting directly above `tauri = { workspace = true }`), plus `aligner-server`/`annotator-server` at `apps/studio/server/Cargo.toml:21-22`. Two dev-deps versioned twice each: `tempfile = "3"` (`crates/lisca:45`, `apps/aligner/server:28`), `tower = { version = "0.5" }` (`crates/lisca:47`, `crates/lisca-server:20`). Root cause: `9fc467b6` brought the Tauri crates from a template after `22861b9d` applied the convention to the four crates then existing.

**Corrections:** the lint bullet is **wrong** — `package.json:47` runs `cargo clippy --workspace -- -D warnings`, a CLI flag applying to every member regardless of `[lints]`, and `[workspace.lints.clippy] all = "warn"` merely restates clippy's default (verified: injecting violations into `lisca-tauri` hard-errors today). Adding `[lints] workspace = true` is future-proofing, not a fix. And `version` inheritance does **not** single-source the desktop version — `tauri.conf.json:4` hardcodes `"version": "0.1.0"` in all three, and that is what Tauri bundles. Severity: low, mechanical, behavior-neutral (`cargo metadata` resolves byte-identically after the change).

---

### G. Boundaries drawn in the wrong place

**G1. A Studio-only chart renderer sits in the shared UI package.** `packages/ui/src/features/analysis/` contains exactly one file, `observable-plot-charts.tsx`. It is the **sole** importer of `@observablehq/plot` anywhere, and the only reason `packages/ui/package.json:43,:47` declares `@lisca/analysis` + `@observablehq/plot`. **Eight** packages declare `@lisca/ui` (`apps/{aligner,annotator,landing,studio}/web`, `apps/{aligner,annotator}/demo`, plus `packages/web-app` and `packages/web-demo`); only Studio can render a result panel (`AGENTS.md:13`). Of its 8 exports, only `ResultPanelsGridView` reaches an app (`apps/studio/web/src/result/result-page.tsx:6`); `buildHistogramPlotOptions` (`:318`) has **zero** callers even inside its own file.

`packages/ui/src/features/` is organized around *UI shared between a standalone app and Studio's embedded stage* — `align/` serves aligner-web + aligner-demo + studio-web, `annotate/` likewise. `analysis/` has one consumer and no second results surface to share with. Root cause is the same as §C: `0e468125` deliberately moved renderers into UI packages because `packages/ui-native/src/features/analysis/` (Victory Native on Skia) existed as a sibling over a platform-agnostic `@lisca/analysis/charts` spec. Only the web half survives.

**Move:** relocate the file to `apps/studio/web/src/result/result-panels-grid.tsx`, beside its only consumer. Export only `ResultPanelsGridView`; delete `buildHistogramPlotOptions` outright; the other 6 stop being public surface (they are live internal callees). Delete `packages/ui/src/features/index.ts:131-140` (which transitively fixes the root barrel at `packages/ui/src/index.tsx:4`). Drop both deps from `packages/ui`; add `@observablehq/plot` to `apps/studio/web` (it already has `@lisca/analysis` at `package.json:15`). Update the `analysis/` row in `docs/ui/ui-package-layout.md`'s feature-domains table and the "Web renderer" section of `docs/analysis/analysis.md`, which currently asserts "chart UI stays in the shared web UI package."

**Correct the cost framing:** this is an **install-graph and dev-server-module-graph** cost, not shipped bytes — `@observablehq/plot` is a value import at `:1`, so Vite dev transforms it whenever aligner/annotator load the features barrel (they do, for `AlignToolSection`), but prod tree-shaking should drop it. The Effect-stack argument does **not** hold: every `@lisca/ui` consumer already reaches `@lisca/client` independently, so no consumer's install graph loses it. What `packages/ui` itself sheds is real (`@lisca/client`, `@effect/experimental`, `@effect/platform-browser`, `@effect-atom/atom-solid`, `d3-array`) — plus an undeclared transitive dep it resolves only via hoisting today.

**G2. `packages/storage` is a folder wearing a package costume.** After §C removes the dead native half, it is ~75 lines in one file: two `localStorage`/`sessionStorage` wrappers (`:14-42`), `configureLiscaStorage` (`:47-53`), two JSON helpers (`:63-79`). It fails every boundary test: 9 source importers of which 6 are `packages/client`; zero dependencies of its own; enforces nothing (`packages/ui/src/shell/theme/shell-theme.tsx:27,39` reads/writes `localStorage` directly, bypassing it entirely); and `packages/utils/package.json:25` **already** depends on it. Two apps have already mis-declared a dependency they never import.

**Move:** live remainder → `packages/utils/src/storage.ts`, re-export from the barrel (`src/index.ts` already `export *`s 12 modules). Delete `packages/storage` — **three files only**: `package.json`, `src/index.ts`, `tsconfig.build.json` (there is no `tsconfig.json`). Update **14** import sites: 6 in `packages/client/src`, 5 in `packages/client/test`, 2 in `apps/studio/web/src`, and `packages/utils/src/server.ts:1` → relative. Delete the docs row at `docs/packages/packages.md:17`. **Utils is the only valid destination** — `packages/client` would cycle (`utils → client → utils` via `server.ts`). No new dep edges: all four declaring packages already depend on `@lisca/utils`. `configureLiscaStorage` is load-bearing (5 client tests inject through it) and **must survive the move**.

> Drop the "dist/ resolved by nothing" argument from any writeup — it is true but repo-wide (utils, contracts, client, ui all have the same `main → ./src/index.ts` + dist-emitting build, and **no tsconfig in the repo declares `references`**, so every `composite: true` is orphaned). That's a separate workspace-level cleanup, not evidence against storage.

**G3. `packages/ui-headless` is drawn wider than its own rule.** `docs/ui/ui-package-layout.md:96-99` states the placement rule: *"1. No SolidJS imports → `@lisca/utils`. 2. SolidJS state without DOM widgets → `@lisca/ui-headless`."* Five modules — `annotation-tools.ts` (46), `task-center.ts` (202), `work-session-picker.ts` (71), `host.ts` (13), `shortcuts.ts` (53) = **385 Solid-free lines** — sit on the wrong side of that line. They are also **exactly** the modules that cross the package boundary (7 external import sites: `packages/client/src/hooks/use-annotate-state-core.ts:18`, `atoms/annotator-ui.ts:9,13,14`, `session/work-session-app-gate.tsx:7`, `session/task-center.ts:1`, `test/task-center.test.ts:2`, `packages/web-app/src/host-operations.ts:3`, `apps/studio/web/src/components/studio-result-dock.tsx:1`). All 9 Solid-coupled modules are consumed **only** by `packages/ui`.

The misplacement is load-bearing: it produced `docs/packages/packages.md:72`'s ambiguous escape clause and two shim files (`packages/ui/src/features/align/align-canvas-handlers.ts`, 12 lines of zero logic; `features/host/host-operations.ts`, 1 line). Utils already houses their structural twins (`crop-status.ts` mirrors `task-center.ts`'s status derivation; `annotate.ts` parallels `annotation-tools.ts`).

**Move:** relocate the 5 modules to `packages/utils/src/` and export from its barrel. No dep edge is added (utils' footprint ⊇ ui-headless's contracts+utils), the only utils import among them (`LiscaAppId` in `work-session-picker.ts:2`) becomes intra-package, 7 import sites change package name only, and both shims dissolve. **Then stop.** Do **not** delete the package or fold the remaining 19 modules into `packages/ui/src/headless/`. The testability rationale is genuinely rebutted (the two vitest configs are byte-identical; 6 headless tests render components) — but the surviving rationale is **dependency enforcement**: ui-headless's deps are exactly `@lisca/contracts` + `@lisca/utils`, which mechanically prevents headless state from importing `@kobalte/core`, Tailwind, or `@observablehq/plot`. A folder inside `packages/ui` cannot enforce that. With the 5 modules gone, ui-headless becomes a coherent single-purpose package matching its own charter, and its 23 subpath exports shrink to the ~19 `packages/ui` consumes. Single-consumer is not a defect when the boundary is what keeps the layer rule true.

**G4. `image_source` (mechanism) reaches into `analysis` (Studio domain).** `crates/lisca/src/image_source/contrast.rs:35,38` call `crate::analysis::array::quantile_floor_subsampled_u16`. That one edge is why `analysis.rs:3` must declare `pub mod array;` un-gated while all nine siblings (`:5-22`) carry `#[cfg(feature = "studio")]` — so `apps/{aligner,annotator}/server/Cargo.toml:22`, which explicitly opt out of `studio`, compile all 444 lines. Origin: `afb9c329` "unify quantiles" deleted a self-contained ~30-line `sampled_values`/`percentile` pair from `image_source.rs` and pointed contrast at `analysis::array`. Correct de-dup, wrong sink.

**Move (much narrower than "extract the general kernels"):** only **one** export has a non-studio consumer — `quantile_floor_subsampled_u16` (`:212`) plus its two in-file helpers `subsample_sorted_u16` (`:191`) and `quantile_floor_sorted_u16` (`:178`): **~36 lines at `:178-214`**, whose own doc comments already say "viewer contrast semantics" (`:177`) and "aligner/viewer auto-contrast" (`:211`). Move them into `image_source/contrast.rs` — their only caller — and add `#[cfg(feature = "studio")]` to `analysis.rs:3`. **Do not create a `numeric.rs`**: everything else is studio-only-consumed (`percentile`/`quantile`/`quantile_linear` `:133-165` → `plot/util.rs:4`; `trapezoidal_integral` `:260` → `auc.rs:3`; `lstsq_affine` `:348` → `fit.rs:405`; `Frame2D`, `masked_roi_stats` → studio), so an un-gated numeric module would push ~250 studio-only lines **outside** the gate — widening the hole. Update `crates/lisca/tests/gene_expression_parity.rs:14` if paths move. **Delete rather than relocate the dead kernels:** `otsu_on_histogram` (`:217`) and `roi_stats` (`:108`) have zero production callers (their only refs are their own tests at `:422`, `:398`). Gating `array` makes rustc's dead_code lint surface these for the first time. **Do not rename `aligner` → `align`** — cosmetic churn against real call sites.

**Correct the cost framing:** `ndarray`/`ndarray-stats`/`ndarray-ndimage`/`noisy_float` are **non-optional** workspace deps (`Cargo.toml:35-38`) and `smart/{segment,exclude}.rs` use `ndarray` directly, so no dependency weight is at stake — gating saves ~369 lines of straight-line Rust parsing, i.e. milliseconds. The argument is layering honesty and gate integrity: a reader of `image_source` cannot currently tell whether the image pipeline depends on Studio.

---

### H. API shape

**H1. The batch ROI-existence check is an N+1.** `packages/client/src/session/use-align-session.ts:562-570` fans out one HTTP round trip per position, and `Effect.all` without a concurrency option runs them **strictly sequentially**. N is the full workspace listing (`:594` feeds `listSavedBboxPositions` straight into `checkCropOverwrite(positions, "batch")` at `:599`) or the full assay position list (`apps/studio/web/src/state/use-studio-align-state.ts:232`). Each element is a real `fetch` to a handler that does one `Path::exists()` stat (`apps/aligner/server/src/routes.rs:105-109` → `crates/lisca/src/aligner/workspace.rs:69-71`).

**The concurrency option is the wrong fix.** The right fix is one round trip: `crates/lisca/src/aligner/workspace.rs:46-67` `list_saved_bbox_positions` already shows the shape — one `fs::read_dir` answers the whole set, and `roi_pos_exists` only stats `roi/Pos{n}` (`:85-87`), a sibling directory. Add `/align/roi-positions` returning `Vec<u32>` (mirroring the handler at `routes.rs:31-34`) and intersect client-side. The `Effect.all` disappears rather than being tuned; no browser connection-limit interaction. Keep `roiPosExists` for the N=1 path at `:587`.

**Severity is low, not high** — these are localhost stats, N is tens (~100-200ms), they gate a *confirmation dialog* not the crop, and `crates/lisca/src/aligner/crop.rs:161-167` re-checks server-side anyway. **Leave `use-align-session.ts:271-281` alone**: it is a large frame fetch plus a ~1ms local JSON read, and sequential `Effect.all` short-circuits — a failed frame load correctly never fires the align-state request. If you touch it, annotate `{ concurrency: 1 }` to record that.

**H2. The health probe is the repo's only raw `fetch` at a LiSCA endpoint.** `packages/ui/src/shell/server/shell-server.tsx:131-132` hand-builds `${base.replace(/\/$/,"")}/fs/home` and calls raw `fetch` — the single literal breach of `AGENTS.md:40` (*"Client IO: Effect programs and shared atoms in `@lisca/client` — not raw `fetch` in components"*). The other 5 `fetch(` hits are a Bun handler/dev proxy (`scripts/serve.ts:80,90`), a test (`scripts/lisca-dev.test.ts:143`), and a same-origin demo image blob (`packages/web-demo/src/browser/load-image-file.ts:215`).

It is redundant: `/fs/home` is a contract endpoint (`packages/contracts/src/http-api.ts:111` with `HomeDirectoryResponseSchema`) with an Effect-typed port method already implemented over the generated client with abort linkage (`ports/types.ts:38`, `ports/host.ts:35-38`). The probe decodes nothing (`shell-server.tsx:135-137` checks `response.ok` only), so any 200 from any server reads as "connected". Cancellation is hand-rolled (`let cancelled` / `let retryTimer` / `AbortController` + a 3-step `onCleanup` at `:113-117,:156-160`).

The hand-rolling has a real cause: `packages/ui/package.json:41-52` has no `@lisca/client` dep. So **the fix is injection, not import** — and the seam already exists for exactly this problem: `packages/web-app/src/host-operations.ts:10-19` adapts the Effect `HostPort` into Promise-shaped `HostFilePickerOperations`, and every app already exports a Promise-shaped adapter with `userHomeDirectory()` at `apps/{aligner,annotator,studio}/web/src/api/*-port.ts:30`.

**Move:** delete `use-shell-http-probe.ts` and `shell/index.ts:54` (§E). Give `ShellServerProvider` an **optional** `probe?: () => Promise<unknown>` prop — optional matters: `apps/annotator/web/test/annotator-header.test.tsx:109` and `apps/studio/web/test/studio-nav-rail.test.tsx:134` mount the provider directly with no such prop, and injecting a fake there is a net improvement (no real network in jsdom). **Correction to the plumbing:** `createLiscaWebApp` cannot supply it itself — `LiscaWebAppConfig` (`create-lisca-web-app.tsx:6-17`) has no port field; thread the existing `*HostOperations` from each `main.tsx`. Retry then lives in the client as `Schedule.recurs(40) && Schedule.spaced(250)` instead of `shell-server.tsx:104-105,119-125`.

**Bonus fix, free:** `shellServerReducer` (`shell-server.tsx:38-48`) has only a `syncRuntime` action and never writes `activeAddress`, while `packages/client/src/session/work-session-gate.ts:72` mutates the module global the client's resolver reads (`packages/utils/src/server.ts:192`). **The status light can describe a server the app is not using.** Moving the probe onto the port removes that divergence by construction.

**H3. Scheduling: two poll loops in one directory, opposite paradigms, and one has a latent env bug.**

`Schedule.` / `Effect.sleep` / `Effect.repeat` / `Effect.retry` / `runFork` / `Fiber.` return **zero** hits across `packages/` and `apps/`, while `effect` is a direct dep of 6 packages. `packages/client/src/session/progress-poll.ts` rebuilds the scheduling layer from `Ref`/`Scope`/`Stream`/`Effect.async` (`:23-32` reimplements `Effect.sleep`; `:62-81`'s `PollState {delayed}` machine reimplements `Effect.repeat` + `Schedule.spaced`; `:89-92`'s `closed` Ref reimplements interruption; `:106-116`'s `forkScoped` reimplements `runFork`/`Fiber.interrupt`). Its sibling `task-center.ts:36-67` does the same job in 31 plain lines.

**Three concrete items, in value order:**

1. **`progress-poll.ts` has a latent bug, and its "pointless test seam" is actually load-bearing.** `:20-21` defaults to `window.setTimeout`, but `packages/client` has no vitest config and the root config sets no `environment` → tests run in **node**, where `window` is undefined. Measured: with the injected timers the loop polls 11× in 1000ms; with the defaults it polls **once**, throws `ReferenceError` on the first delay, and `forkScoped`'s `.catch(() => {})` (`:111`) swallows it. `test/progress-poll.test.ts:39-40` *must* inject. **Fix `window.` → `globalThis.`** (what `task-center.ts:38` already does) — highest value, one word. The `closed` Ref is additionally **inert**: `Scope.addFinalizer` (`:92`) fires only after `Stream.runForEach` (`:96`) has already completed or been interrupted, so all four `Ref.get(closed)` guards always read `false`.
2. **`task-center.ts:28-29`'s `schedule`/`clearSchedule` options are dead** — no caller passes them (`apps/{aligner,annotator,studio}/web/src/components/*-task-center.tsx:16` pass only `{gateway, onSnapshot, onError}`; `test/task-center.test.ts:65-70` passes none). Delete.
3. **Optionally** migrate `progress-poll.ts` to `Effect.repeat` + `Schedule.spaced` + `Effect.runFork`/`Fiber.interrupt`. Use `Effect.suspend(() => options.pollProgress())` — a naive `Effect.repeat(options.pollProgress())` evaluates the factory once. Teardown must be `Effect.runFork(Fiber.interrupt(fiber))`, **not** `Effect.runSync` (throws `AsyncFiberException`). `vi.useFakeTimers()` works with Effect's clock — **no TestClock or `@effect/vitest` needed.** Rewrite the test to assert the loop *repeats* before teardown, not just that it stops (it currently passes on a dead loop).

**Do not unify the two loops.** They have genuinely different contracts: `progress-poll.ts:51-54` terminates on error (`continue: false`), while `task-center.ts:32-35` documents and `test/task-center.test.ts:55-81` locks the opposite — resolve → reject → resolve, asserting 2 snapshots, 1 error, and **3 calls**, so a transient blip recovers in place. Unifying breaks a passing test and a real UX property (`task-center.tsx:323-325` keeps the last good list behind a refresh banner). `TaskCenterGateway` is also deliberately Promise-shaped in `@lisca/ui-headless`, which has no `effect` dep. Two loops with different error contracts is a defensible outcome.

**Leave alone:** `packages/ui/src/shell/server/shell-server.tsx:104-125` (packages/ui has no `effect` dep — a 40×250ms retry does not justify adding one; fix it via H2 instead) and `apps/studio/web/src/result/save-result-pdf.ts:11-33` (a DOM-readiness poll counting `<svg>` elements, not IO scheduling; `Effect.timeout` would not remove the loop — a `MutationObserver` would).

**H4. Two live DI mechanisms; the deprecated one is the live path.** Collapse into the §E deletions: have `createLiscaPortCore` construct the port eagerly and return `{ client, httpBaseUrl, toErrorMessage }`; delete `port-registry.ts` and the `registry`/`read`/`ensure`/`setForTests`/`resetForTests` members of `LiscaPort<T>` (`port-core.ts:11-19,44-52`) plus their 12 app-prefixed re-exports. Each app keeps `export const alignerClient = port.client;` — **the ESM module binding *is* the singleton**, which is the whole point. `ensure` has 6 live call sites (`*-port.ts:27` ×3, `*-query-atoms.ts:9` ×3), each a mechanical one-liner. Also prune `bootstrap.port` and `bootstrap.runPromise` (zero consumers; only `.runtime` is used). The `env` block can be hoisted too — all three callers pass it identically (`packages/ui/src/shell/server/shell-server.tsx:54-56` sets the precedent of reading `import.meta.env` inside a package, valid because `@lisca/web-app` ships source).

**Do not** make the Layer the sole DI seam — 16 app files import the port at module scope and run it through bare `runClientEffect`; migrating them is a real refactor justified on its own merits, not a free rider on this deletion.

---

### I. Docs

**I1. Record the app-shape decision as an ADR — this is the only doc item that pays for itself.** Grep for `router|routing|single.page|tanstack` across `AGENTS.md`, `CONTEXT.md`, `README.md`, and `docs/` returns exactly **two** lines: `AGENTS.md:39` (a blanket tech-stack item inside the agent-maintained memory fence at `:37-51`) and `docs/ui/ui-package-layout.md:60` ("route loading fallback"). No document states that Aligner and Annotator are single-page apps. Meanwhile `CONTEXT.md:32-35` already carries the **premise** — *"Aligner hosts an Align session"* / *"Annotator hosts an Annotation session"* (one session each) vs *"Studio composes assay setup, Align and Annotation sessions, an Analysis run, and result review in one workflow"* — and never draws the conclusion.

**Be honest about causation:** the docs did **not** cause the routers. `git log` proves the TanStack line was human-authored in the first spec (`2c5d87fa`, five weeks before the memory fence existed at `4866f222`), and aligner genuinely had `/raw` + `/roi` at `ebe44f8e`. The routers are residue of a real multi-route era. The docs gap is that the *reversal* was never written down.

**Move:** `docs/adr/0001-app-shapes.md` — the normative rule with its reason, framed as a change from the earlier design. `AGENTS.md:33` and `docs/agents/domain.md:8,13` already designate `docs/adr/` for exactly this, created lazily when a decision resolves; the directory does not yet exist. Alternatively, ~3 lines appended to `CONTEXT.md`'s existing `## Product composition` section, where the premise already lives — cheaper, no new convention, conclusion next to premise. Either beats an ambiguous stack-list line.

**I2. `PORTING.md` — 1174 lines, one commit, zero references.** `git log --follow` returns exactly `f26f0890` (2026-07-10); 47 commits since have not touched it. It is written in future tense (`:7-8` "are being **deleted**", `:12` "Strategy: **Big bang**"), carries a §14 trial-run plan (`:1112`) and a per-file checklist (`:1154`), and is unreferenced by any script, config, or the Context index (`grep -rn "PORTING"` returns only self-references at `:1,:1116,:1143`). It violates `AGENTS.md:19`'s own rule (docs live in `docs/{domain}/`). Genuinely stale: `:757` cites `packages/ui/coss-theme.css` (disk has only `packages/ui/theme.css`); `:626,:653` reference a `liscaReactPlugin` that no longer exists.

**Corrections to any writeup:** the branch is **not** gone (`origin/port/solidjs-rewrite` still exists, merged); the Kobalte claim is **wrong** (`:11,:26` planned `@kobalte/core` and that is exactly what shipped — `packages/ui/package.json:42`, `packages/ui/src/components/ui/button.tsx:1`; zaidan is the registry *distributing* Kobalte components, per `AGENTS.md:45`); and it is ~47-49% of tracked markdown, not 63%.

**Move:** the repo's own convention (`AGENTS.md:25`, `docs/agents/issue-tracker.md:3-8`) puts plans in `.scratch/<slug>/` and keeps resolved ones in place (`.scratch/task-queue/issues/01-05` are `Status: resolved` and still on disk). **Move it to `.scratch/porting/PRD.md` with `Status: resolved`.** Do this *after* the routing work lands — `:23` and §6 are currently the only written explanation of why the router is in the SPAs, and that trail is useful while the removal is open. Consider rehoming §13's framework-current Solid rules (components run once, never destructure props, `<For>` over `.map`) to `docs/ui/solid-idioms.md` — they are true, and documented nowhere else (`grep -rn 'destructure|splitProps|createSignal|onMount' docs/` → zero hits).

**I3. `docs/packages/packages.md:72`.** *"Apps should import shared UI types from `@lisca/ui/features`, not directly from `@lisca/ui-headless/*`, **unless the app already depends on headless**"* — the clause is genuinely ambiguous. Read as "declares in package.json", all three apps qualify and it forbids nothing; read as "already imports", only Studio qualifies (`apps/studio/web/src/components/studio-result-dock.tsx:1`, `resolveKeyboardShortcut`) — but then the exemption is unlocked only by committing the forbidden import. **Do not state it absolutely** as first proposed: `resolveKeyboardShortcut` is not re-exported from `@lisca/ui/features`, so Studio's import is currently the only route. Rewrite to name Studio's `shortcuts` import as the one sanctioned exception, and delete the phantom deps that make the loose reading live (§E). §G3 dissolves most of this anyway.

**I4. Small factual drift.** `AGENTS.md:48` tells agents to run `vp run contracts:generate` — **no such script exists** in any package.json (the real command is `vp run --filter @lisca/contracts generate`; `docs/contracts/contracts.md:50` has it right). `AGENTS.md:30`'s citation of `.oxlintrc.json` is stale — deleted in `15907fa0`; the `import/extensions` rule now lives at `vite.config.ts:36-45` (the file's own comment at `:18` says "migrated from .oxlintrc.json"). `crates/lisca/src/lib.rs:3-5`'s `extern crate self as lisca` justification cites `x-rust-type`, which occurs **zero** times in `contract.schema.json`, `openapi.json`, or `generated.rs`. `crates/lisca-server` is undocumented anywhere (`grep` across docs/, AGENTS.md, CONTEXT.md returns zero) despite being the newest structural change.

---

## 4. What NOT to change

These look wrong and are right. Touching them is churn or regression.

**`crates/lisca` is not a 24k-line monster.** 12,794 of 22,942 lines are `protocol/generated.rs`, a `cargo typify` artifact (`packages/contracts/package.json:31`). Hand-written: 10,148 lines / 62 files. Any judgment based on the headline number is measuring a build artifact. `generated.rs` is also the **one** generated artifact that must stay committed — Rust builds without bun/cargo-typify.

**The contract pipeline's load-bearing hacks.** `packages/contracts/src/schema/primitives.ts` — attaching `jsonSchema` `format` to pin u32/i32/f64 is the minimum viable seam between Effect's `number` and Rust's numerics, and the `U64` `MAX_SAFE_INTEGER` clamp (`:14-25`, tested at `test/golden-roundtrip.test.ts:183-186`) is a real precision guard. The deliberate strip of `additionalProperties: false` (`gen-rust-schema.ts:63`) to avoid `deny_unknown_fields`, and the omission of a root `title` (`:121-126`) to avoid a typify wrapper, are both correct with reasoning recorded inline. `schema/roi-bbox.ts` at 13 lines exists to break an align↔annotate cycle — small but right. The paired golden tests (`test/golden-roundtrip.test.ts` + `crates/lisca/src/protocol.rs:37-140`) locking the same shapes from both languages is the right shape of defense; the gap is coverage and automation, not design.

**The task scheduler's unused DAG is spec-driven, not speculative.** `TaskSpec::with_dependencies` (`crates/lisca-server/src/task_scheduler.rs:136`) has 13 call sites, all in tests — but `.scratch/task-queue/PRD.md` mandates it ("Each operation owns a directed acyclic graph of tasks… Cycles and references to invalid dependencies are rejected"), backed by user stories 13/18/19/32, and `.scratch/task-queue/issues/07-gene-expression-fan-out.md` + `08-immune-killing-fan-out.md` are `Status: ready-for-agent` with both blockers (03, 05) **resolved**. Crop being flat is also the spec ("Cropping is exactly one task per position"), not a counterexample. Under your own yardstick — *the same product design in mind* — the answer is yes. The 0.85:1 test ratio is likewise correct for a concurrency policy engine whose entire value is behavior under interleaving.

**Annotator's always-empty scheduler is required.** `apps/annotator/server/src/main.rs:22,28-31` builds a `TaskScheduler` and merges `task_router()` despite zero submissions — because `apps/annotator/web/src/components/annotator-header.tsx:11` mounts `<AnnotatorTaskCenter />`, which polls `/tasks/operations` every 1500ms (`packages/client/src/session/task-center.ts:36-60`). `.scratch/task-queue/issues/05-task-center-annotator-studio.md` is **resolved** and required it; the PRD says "The task button remains available regardless of whether work exists." Removing `task_router()` 404s every poll.

**Studio's server as a superset binary is the product design.** `apps/studio/server/Cargo.toml:21-22`'s path deps on `aligner-server` + `annotator-server` are the workspace's only app-to-app edges — and `PRODUCT.md:69-73` states this is intentional: *"Studio's binary is Aligner + Annotator + analysis on one port… Nothing is reimplemented."* Also: `00efea10`'s rule ("Keep library crates under crates/") targets crates that are *only* libraries — `crates/lisca-server/Cargo.toml` has no `[[bin]]`; `aligner-server`/`annotator-server` are **binary** crates with a lib target, the standard Cargo pattern. `AGENTS.md:41` documents `apps/*/server`. And `a57e38d3` deliberately moved route logic *out* of `crates/lisca/src/server.rs` (−912 lines) into per-app servers. Relocating the lib halves would rename the dependency edge without deleting it, add crates, worsen navigation, and undo a recorded decision. **Owner's call if you want to restate the filing rule — but the code is not wrong.** The one real residue is that those two path deps bypass `[workspace.dependencies]`; fold that into §F5.

**`packages/web-app` is correctly cut.** All three product apps consume all four entries: `.` (`main.tsx:1`, `api/*-port.ts:3`), `./vite` (`vite.config.ts:1`), `./app.css` (`index.css:1`). The halves are co-consumed, not disjoint, and change together. Landing is not a counterexample: it takes only `liscaSolidPlugin` (which is `return solid();` at `vite.ts:31-33`) and `fonts.css`, and already declares `vite-plugin-solid` itself. Every workspace manifest is `"private": true` with no publish step and no `--production` anywhere, so the dep/devDep split is inert taxonomy. Splitting it would add a package and a dep edge and remove neither.

**`packages/client`'s align stack is the dedup, not the debt.** `619735c3` "refactor: deepen workflow modules and unify contract seams" is exactly this refactor: `use-studio-align-state.ts` **−451**, `use-align-state-core.ts` **−445**, `use-align-session.ts` **+472**. `useAlignSessionCore` **is** the shared boundary; `AlignSessionPolicy` (`use-align-session.ts:120-134`) carries doc comments naming Studio explicitly. The apparent asymmetry (Aligner enters via `useAlignStateCore`, Studio via `useAlignSessionCore`) is because Studio needs six policy fields the flattening adapter forwards none of. And the annotate axis — held up as the model — writes the 47-getter block **twice** (`apps/annotator/web/src/state/use-annotate-state.ts:39-181` is a *pure* pass-through adding zero fields, plus `apps/studio/web/src/state/use-studio-annotate-state.ts:227-368`). **Align pays it once; align is strictly leaner than the axis it would be told to imitate.**

**The task-center poll loop's separate error policy.** See §H3. `packages/client/test/task-center.test.ts:55-81` locks it.

**The demos' parallel smart-segment.** `annotator-main.tsx:16-29` (request → `/annotate/smart-segment`) vs `demo-annotator-main.tsx:13` (in-browser ONNX + model dialog), both converging on the shared `useSmartSegment`. A genuine server-vs-browser boundary, not duplication.

**Align/annotate feature folders having two consumers each.** Studio is the union of the other two pipelines by design (`AGENTS.md:10-13`). Two consumers is expected, not fragmentation.

**The `lisca-crop` CLI's thread pool** (once moved into the bin per §F4). `TaskScheduler::new` requires a live Tokio runtime (`task_scheduler.rs:345-346`); a fire-and-exit benchmark CLI has no use for HTTP-observable round-robin fairness. And `crates/lisca-server` already deps `lisca`, so routing the bin through it is a cargo-rejected cycle.

**No boundary lint zones.** The only lint rule in the repo is `import/extensions` (`vite.config.ts:36`) — and every documented boundary was checked and holds with **zero violations**: `packages.md:27` (wizard types via `/assay`), `ui-package-layout.md:43-45` (canvas/ isolation, no cross-domain, no app imports), and `shell → features` (zero edges). Encoding restricted-import zones is tooling against a problem that has never occurred.

**`crates/lisca-tauri`, `image_source/adapters.rs`, `http::run_server`.** The models. `lisca-tauri` (194 lines) reduces all three desktop mains to 13 lines; `SourceAdapter` has three real implementers (Nd2, Czi, Folder); `serve.rs:53` reduces each server main to one call.

**`README.md` blank, `CLAUDE.md` a 9-byte pointer.** Both are enforced policy (`AGENTS.md:18`), not vestige. Correct de-duplication.

**`packages/utils`' single `export *` barrel.** 12 modules, 1,903 src lines, 969 test lines, consumed by every package and app. Pure, DOM-free, Solid-free — exactly what `AGENTS.md:34` prescribes.

**One real bug hiding in utils, though:** `packages/utils/src/contrast.ts:5` declares a private `const defaultContrastDomain = {min:0, max:255}` that **shadows** the exported pixelType-aware function of the same name at `frame.ts:98` (which returns 0–65535 for uint16). Both files are `export *`d from the same barrel (`index.ts:4,12`). No TS collision (the contrast.ts one is unexported), but `deriveContrastControlState` silently defaults uint16 frames to 0–255 while `normalizeFrameContrast` defaults them to 0–65535. A third copy of the same 0–255 const sits at `packages/client/src/atoms/annotator-ui.ts:63`. **Worth its own look — it is not covered by any finding above.**

---

## 5. Sequencing

### Wave 0 — today, no blockers, no risk

1. **Fix `runClientEffect`** (§A) + the regression test. One function; revives dead error handling at 35 call sites; zero call-site changes. **Do this first — it is the only user-visible defect in the report.**
2. **Delete the phantom deps** (§E, 7 lines across 6 manifests). Independent of everything.
3. **Delete the dead surface** (§E) — `api-client.ts:37-45` + the `Context` import; `dropdown-menu.tsx` + `card.tsx` + their `theme.css` blocks; `packages/ui/src/hooks/` + its export subpath; `stat-tile.tsx`; `ShellDock`/`ShellSidebar`; `use-shell-http-probe.ts` + `shell/index.ts:54`; `canvas-status.ts:3-9` + its test; `studio-annotate-session-bridge.ts`; `studio-crop-progress-modal.tsx`; `frame-load-policy.ts`'s `kind`; `work-session.ts:150`; the studio orphan assets.
4. **Delete the native-tier vestiges** (§C) — `capabilities.ts` + the whole `describe` at `chart-spec.test.ts:71-77` + its imports at `:6-7`; `VICTORY_DOMAIN_PADDING`; `storage/src/index.ts:7-12,81-145`; the `batch` injection + its ui wrapper; headless `contrast-control.ts`. Fix `docs/analysis/analysis.md:16,21` and `docs/ui/ui-package-layout.md:25,36` in the same commit.
5. **`ShellNavbar` route switcher** (§B2). Independent of the router work; land it now.
6. **`progress-poll.ts` `window.` → `globalThis.`** and delete `task-center.ts:28-29`'s dead options (§H3.1–2). One word + 2 lines.
7. **`docs/adr/0001-app-shapes.md`** (§I1) — write it *before* the router work so the reason is on record while the diff lands.

### Wave 1 — the routing seam (blocks four apps)

8. **All three seams together** (§B): `create-lisca-web-app.tsx` (`router: AnyRouter` → `App: Component`; Studio passes `() => <RouterProvider …>`), `create-lisca-demo-app.tsx` (delete it; inline the render), `vite.ts:152` (plugins passthrough; Studio and Landing supply `tanstackRouter` themselves).
9. **Then** delete `routes/` ×4, `routeTree.gen.ts` ×4, the four `main.tsx` bootstrap blocks, and the `@tanstack/*` deps in the four app manifests + `packages/web-app` + `packages/web-demo`. **Note:** `@tanstack/router-plugin` in the two web apps and `packages/web-demo` is already an unused declaration — droppable in Wave 0.
10. **Then** `.scratch/porting/PRD.md` (§I2), once the router rationale is no longer needed.

### Wave 2 — duplication (independent of Waves 0/1, parallelizable)

11. **Studio port** (§D1) — verified fix, typecheck + 99 tests clean.
12. **Studio atoms** (§D2) — verified fix; move the types too.
13. **`withClientEffect` ×5** (§D4) → `infra/`.
14. **Port construction** (§H4) — `createLiscaPortCore` returns the client; delete `port-registry.ts` + 12 dead re-exports + `bootstrap.port`/`runPromise`; each app file drops to ~6 lines.
15. **Align pointer arbitration** (§D3) → `packages/ui-headless/src/useAlignCanvasPointerHandlers`.
16. **Rust duplication** (§F2, §F3) — `onnx.rs`; `write_metric_plots` + `write_subplot_grid` → `analysis/plot.rs`; timeseries loading → `analysis/timeseries.rs`; delete `gene_expression::run_sync`.
17. **Rust latent bugs** (§F1) — epoch millis + delete the three `sort_by`; `foldDefs(MemoryTouchRequestSchema)` + the identifier guard + delete `MemoryTouchBody`; un-delete `RequestError`; serialize the generated `Unauthorized`.
18. **`crop_roi` → the bin** (§F4); fix `lisca-crop.rs:3`.
19. **Cargo table** (§F5) — mechanical, behavior-neutral.

### Wave 3 — boundaries (ordered; each unlocks the next)

20. **Charts out of `packages/ui`** (§G1) → `apps/studio/web/src/result/`. **Unblocks #23.**
21. **Storage → utils** (§G2) — requires Wave 0 item 4 (the dead half) first.
22. **The 5 Solid-free modules → utils** (§G3); both shims dissolve; `packages.md:72` (§I3) is fixed by the same change.
23. **`image_source` back-edge** (§G4) — move `array.rs:178-214` into `contrast.rs`, gate `pub mod array`, delete `otsu_on_histogram` + `roi_stats`.
24. **`/align/roi-positions`** (§H1); **probe injection** (§H2, which also fixes the stale `activeAddress`).

### Owner decisions — do not let an agent guess these

- **`packages/analysis`.** Once #20 lands it has exactly one consumer (`apps/studio/web`), no build script, and a central export typed `AppRuntime<StudioPortService>` (`atoms/analysis-panels.ts:20`) — it cannot serve a non-Studio consumer without a signature change. **Three options:** (a) fold `src/` into `apps/studio/web/src/result/` and `atoms/` into `studio-analysis-atoms.ts` (which is already its only caller), moving `test/` to `apps/studio/web/test/` and adding `d3-array` + `@types/d3-array` to `apps/studio/web` (**it is not there today, and not reachable via `@lisca/client` — verify before assuming**); (b) move only `atoms/analysis-panels.ts` to studio-web (safe **today**, not contingent on #20 — `packages/ui` imports only `/charts` and two types), keeping the pure model in the package; (c) keep it as-is. Independent of the choice: delete `immune-killing/catalog.ts` (`IMMUNE_KILLING_RESULT_PLOT_FILES` has exactly one occurrence repo-wide — its own definition), `TIMESERIES_RESULT_PLOT_FILES`, and `displayedParameterPlotFileName` (`shared/panels.ts:85-87`) — all zero-consumer.
- **Studio analysis on the scheduler.** Already ticketed and unblocked (issues 07/08 `ready-for-agent`, blockers 03/05 resolved). Per PRD, fan out **per position/site/time-series with fan-in dependencies** — *not* a serial chain of the five `AnalysisStage` values (`PRD.md:92` forbids collapsing a workload into a monolithic task). **Keep** `/studio/analysis-progress`, `/studio/latest-analysis`, `/studio/analysis-results` as compatibility projections over Operation state (the crop precedent: `apps/aligner/server/src/routes.rs:181-205` + `crop.rs:36-190`) — they also read results off **disk** via `workspace_analysis_manifest` when no in-memory run exists (`routes.rs:216-233,238-266`), which the scheduler's capped in-memory history (`task_scheduler.rs:960-966`) cannot do and which `resume-pending-runs.ts:70` relies on after reload. Only `KeyedRuns` + `RunStatePoisoned` + `AnalysisJobState` are deletable. **Bonus bug for the same ticket:** `immune_killing.rs:87-114` runs the whole pipeline inside one `run_blocking(run_sync)` then fires five `update_progress` calls **after** the work completed — the reported stage progress is fabricated.
- **Do the demo standalone sites earn their keep?** `LISCA_BUILD_DEMO_SITE` is set nowhere; the only real entry is a manual `vp dev`. Keep the preview (3 lines) or delete `index.html` + `vite.config.ts` too.
- **Are the two documented portability claims commitments or vestiges?** `docs/contracts/contracts.md:8-9` asserts the Rust server "can be swapped for any other backend (Node, FastAPI, …)"; `docs/analysis/analysis.md:16` describes a "platform-agnostic" chart layer where "the current app uses `web`". Both assert swappability nothing exercises. **This single answer decides the fate of several abstractions** — and one of them (`capabilities.ts`) is already scheduled for deletion in Wave 0 on the grounds that the second platform is gone. Confirm.
- **`apps/*/server` filing.** §4 argues the current shape is correct (`00efea10`'s rule targets pure-lib crates; `a57e38d3` deliberately made this split; `AGENTS.md:41` documents it; `PRODUCT.md:69-73` makes the composition product design). If you disagree, the concrete move is: lib halves → `crates/lisca-align` and `crates/lisca-annotate` (name for the **domain**, not "routes" — `apps/aligner/server/src/crop.rs` is 425 lines of job-state, not routing), leaving `apps/*/server` as `main.rs`-only. It is **not** zero-cost: `scripts/check-openapi-routes.ts:14-22` hardcodes an `apps/*/server/src/routes.rs` scan and would drop the `/align/*` + `/annotate/*` paths (failing loudly), and `apps/studio/server/package.json:6`'s hand-maintained `cargo watch` list needs updating (it is already drifting — it watches `crates/lisca` but not `crates/lisca-server`).
- **`packages/utils`' `defaultContrastDomain` shadow** (§4, last item). Two functions with the same name and different uint16 behavior in one barrel, plus a third copy at `annotator-ui.ts:63`. Decide which is right before someone hits it.