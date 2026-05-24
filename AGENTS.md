# AGENTS.md

## Concept

software stack for experimental platform 'live-cell imaging on single cell arrays'

## Client state

- **Effect Atom** (`@effect-atom/atom-react`) for all reactive client state: server queries, mutations, UI session, and wizard drafts.
- **`@lisca/client` ports** remain the IO boundary (`ClientEffect`); atoms call ports via `Atom.runtime` + port layers.
- Wrap apps with `RegistryProvider` (see each app's `*-atoms-provider.tsx`).
- Patterns and conventions: [`packages/client/src/atoms/README.md`](packages/client/src/atoms/README.md).

## Reference for UI and design pattern

- https://github.com/pingdotgg/t3code or ../t3code local clone
