---
name: solidjs
description: Use when writing, reviewing, debugging, or testing Solid applications and libraries that use `solid-js`, `@solidjs/router`, `@solidjs/start`, or `@solidjs/meta`; covers fine-grained reactivity, components and props, stores, resources, routing, server functions, SSR and hydration, metadata, and Solid component tests.
---

# SolidJS

Use the official Solid documentation and the installed package version as the source of truth. Solid components establish a reactive graph once; they are not React render functions.

## Workflow

1. Read the repository instructions and inspect `package.json` plus the lockfile to identify the installed Solid packages and versions. For SolidStart, distinguish v1 from v2 before consulting docs or changing code.
2. Read only the documentation branch needed for the task:
   - [`references/core.md`](references/core.md) for `solid-js`, JSX, reactivity, stores, resources, rendering, or tests.
   - [`references/router.md`](references/router.md) for `@solidjs/router`, navigation, route data, actions, or revalidation.
   - [`references/start.md`](references/start.md) for `@solidjs/start`, file routes, server functions, middleware, sessions, API routes, SSR, or deployment.
   - [`references/meta.md`](references/meta.md) for `@solidjs/meta` or document-head management.
3. Consult the exact API page before using an unfamiliar primitive. In this documentation repository, read the mapped file under `src/routes/`; elsewhere, use the mapped `https://docs.solidjs.com` page. Confirm signatures against the installed package types when docs and dependencies differ.
4. Implement with the existing project conventions. Preserve reactive accessors and owners across module and component boundaries.
5. Run the narrowest relevant test, typecheck, lint, or build. Expand verification when the changed primitive is shared or when focused proof fails.

## Core model

- Read a signal, memo, resource, or reactive prop inside the tracking scope that must update. Pass an accessor when the receiver needs a live value; pass its result when the receiver needs a snapshot.
- Keep derived state in a derived signal or `createMemo`. Use `createEffect` for synchronization with systems outside the reactive graph, and pair created external resources with `onCleanup`.
- Preserve prop reactivity by reading from `props`, wrapping a read in an accessor, or using `splitProps` / `mergeProps`. Treat direct destructuring or assignment as a snapshot unless that is intentional.
- Use `<Show>`, `<Switch>`, `<For>`, and `<Index>` when their keyed or reactive behavior fits the UI. Choose `<For>` for changing list identity/order and `<Index>` for stable positions with changing values.
- Use `createStore` when property-level reactivity is useful. Update stores through their setter, path syntax, `produce`, or `reconcile` rather than mutating the proxy directly.
- Represent async state with the primitive owned by the relevant layer: `createResource` in core Solid, or Router queries with `createAsync` / `createAsyncStore` when Router owns caching and revalidation. Place async and failure UI under appropriate `Suspense` and `ErrorBoundary` boundaries.
- Keep browser-only APIs out of server execution, and make hydration output deterministic between server and client.

## Completion

Before finishing, account for every changed reactive read, derived value, side effect, external resource, async state, and server/browser boundary. Report the documentation pages consulted and the exact verification commands with their results.
