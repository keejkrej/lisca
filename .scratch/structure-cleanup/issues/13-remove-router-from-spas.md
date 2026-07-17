# 13 — Remove the router from Aligner and Annotator

**What to build:** Aligner and Annotator each present one screen and have no second destination, yet each carries a full TanStack Router — across **four** builds, not two (`aligner/web`, `aligner/demo`, `annotator/web`, `annotator/demo`), whose four generated route trees are byte-identical. There are zero navigation calls, zero URL-carried state, and no deep links across both apps. The one piece of real URL state, `?liscaHttp=`, is read via raw `URLSearchParams` and never went through the router. Mount each app's root component directly and delete the machinery. Studio (6 routes) and Landing (3 routes) genuinely navigate and keep their routers.

Three seams enforce the router and must change first: `createLiscaWebApp` requires a `router` field and renders `<RouterProvider>` unconditionally; `createLiscaDemoApp` does the same; and `createLiscaViteConfig` installs `@tanstack/router-plugin` for every consumer. Replace the router field with a root-component slot rather than making it optional — an optional field with a fallback is a lateral move, and `createLiscaDemoApp` already carries exactly that dead slot with no caller.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] `ShellNavbar`'s unreachable route-switcher API is gone: the required route props, the `ShellNavbarRouteItem` type, and the render branch whose guard both presets fail on both clauses.
- [x] `createLiscaWebApp` takes a root component instead of a router; Studio passes its `RouterProvider` through it.
- [x] `createLiscaDemoApp` is deleted and its render inlined into the two demo entries, without merging it into `createLiscaWebApp` — that factory exists to supply the provider stack the demos deliberately lack.
- [x] `createLiscaViteConfig` takes a plugins passthrough; Studio supplies `tanstackRouter` itself, as Landing already does.
- [x] `routes/`, `routeTree.gen.ts`, and the `createRouter`/`createHashHistory`/`Register` bootstrap are gone from all four builds, and `@tanstack/*` is gone from those manifests and from `packages/web-app`/`packages/web-demo`.
- [x] `@tanstack/solid-router` remains in the workspace for Studio and Landing.
- [x] Behavior is identical — these are single-route apps; `?liscaHttp=` handling is untouched.
- [x] `vp run check` shows no new failures beyond the 3 known `*-desktop#typecheck`.

The reasoning is recorded in `docs/adr/0001-app-shapes.md` — the asymmetry with Studio is deliberate and invites a well-meaning "fix". This already went wrong once: aligner had a second route at `6956d8ed`, `2c17faf7` removed it, the router stayed, and `PORTING.md` §6 then translated the residue verbatim into SolidJS.

See PRD §B, §B2, §B3.
