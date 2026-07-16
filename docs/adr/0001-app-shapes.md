# Aligner and Annotator are single-page apps; only Studio and Landing route

Aligner and Annotator each present one screen and have no second destination, so they mount their
root component directly and carry no router. Studio (6 routes) and Landing (3 routes) genuinely
navigate and keep TanStack Router. `packages/web-app` therefore takes a root component (`App`)
rather than a router, and `createLiscaViteConfig` takes a `plugins` passthrough rather than
installing `@tanstack/router-plugin` for everyone — Studio supplies its own.

## Why this is written down

The asymmetry looks like an oversight and invites a well-meaning "fix". It is deliberate.

It has already happened once: Aligner had a second route at `6956d8ed`; `2c17faf7` removed it, and
the router stayed. `PORTING.md` §6 "Router Migration (TanStack)" then translated the residue
verbatim into SolidJS rather than asking whether it was still needed. The result was four builds
(`aligner/web`, `aligner/demo`, `annotator/web`, `annotator/demo`) shipping byte-identical generated
route trees for exactly one route each, plus a `NotFound` handler whose only destination was the
app's only route — a 404 page cleaning up after the router that was the sole reason 404s existed.

**Do not re-add a router to Aligner or Annotator to make the apps consistent with Studio.** Add one
only when an app gains a real second destination.

## Consequences

- `packages/web-app` and `packages/web-demo` depend on no router. `@tanstack/solid-router` stays in
  the workspace for Studio and Landing.
- The one piece of real URL state, `?liscaHttp=`, never went through the router — it is read via raw
  `URLSearchParams` in `packages/client/src/infra/urls.ts` and `packages/utils/src/server.ts`, and is
  unaffected. The routers used `createHashHistory`, so they owned `#/` while that state lived in the
  search string: disjoint parts of the URL.
- Studio constructs the only router in the repo outside Landing, and passes it to `createLiscaWebApp`
  as `App: () => <RouterProvider router={router} />`.
