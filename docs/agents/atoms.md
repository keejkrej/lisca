# Effect Atom patterns (`@lisca/client/atoms`)

Shared query/mutation atoms live here. Each web app adds UI writable atoms and a `RegistryProvider` bootstrap.

## Runtime

```typescript
import { alignerPortLayer, createAlignerQueryAtoms, createAppRuntime } from "@lisca/client/atoms";

export const runtime = createAppRuntime(alignerPortLayer(port));
export const { scanSourceAtom } = createAlignerQueryAtoms(runtime);
```

`createAppRuntime` merges `Reactivity.layer` with the port layer.

## Family keys

Use `Atom.family` for parameterized queries. Serialize composite keys with `JSON.stringify` when the param is an object (e.g. aligner source, analysis CSV input).

## Reactivity invalidation

Query atoms use `Atom.withReactivity([ReactivityKeys.…])`. Shared key helpers are in `reactivity.ts` (stable string keys). Mutations call `invalidateAfter(effect, [ReactivityKeys.…])` on success so related queries refresh.

## keepAlive vs default

- **`Atom.keepAlive`**: scan sources, ROI workspace scans, annotation labels, analysis CSV/panels — data that should survive param churn within a session.
- **Default (no keepAlive)**: ephemeral UI writable atoms unless persisted manually to `sessionStorage`.

## Result handling in React

Use helpers from `result-utils.ts`:

```typescript
import { resultData, resultFailureMessage, resultLoading } from "@lisca/client/atoms";

const scan = resultData(useAtomValue(scanSourceAtom(key)));
const loading = resultLoading(useAtomValue(scanSourceAtom(key)));
const error = resultFailureMessage(useAtomValue(scanSourceAtom(key)));
```

Mutations: `useAtomSet(mutationAtom, { mode: "promise" })`.

## App UI atoms

Writable session/UI state stays in each app (`*-ui-atoms.ts` or `*-store.ts` atom-backed hooks). Persist workspace/source/selection via `sessionStorage` + `useAtomInitialValues` on boot.

## Modules

| Module                 | Atoms                                                   |
| ---------------------- | ------------------------------------------------------- |
| `aligner/queries.ts`   | scan source, saved bbox positions, auto-exclude preview |
| `annotator/queries.ts` | ROI workspace scan, labels, save labels/annotation      |
| `studio/queries.ts`    | scan source, ROI workspace scan, auto-exclude preview   |
| `studio/analysis.ts`   | analysis results, analysis CSV text                     |

Panel parsing (CSV → plot panels) stays in `studio-web` because it depends on app-local plot parsers.
