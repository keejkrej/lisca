# Effect Atom patterns (`@lisca/client/atoms`)

Shared query/mutation atoms live here. Each web app adds UI writable atoms and a `RegistryProvider` bootstrap.

## Runtime

```typescript
import { alignerPortLayer, createAlignerQueryAtoms, createAppRuntime } from "@lisca/client/atoms";

export const runtime = createAppRuntime(alignerPortLayer(port));
export const { scanSourceAtom } = createAlignerQueryAtoms(runtime);
```

`createAppRuntime` merges `Reactivity.layer` with the port layer.

## Cross-product data access

**Query atoms** cache session-stable reads (`keepAlive` + `ReactivityKeys`). **Mutation atoms** write through the port and call `invalidateAfter` so related queries refresh.

**Imperative port calls** (`runClientEffect(client.*)`) handle ephemeral loads, explicit checkpoints, and long-running jobs. Do not add query atoms for these paths.

| Concern                | Aligner                                      | Annotator                  | Studio                                   |
| ---------------------- | -------------------------------------------- | -------------------------- | ---------------------------------------- |
| Source scan            | `scanSourceAtom`                             | —                          | `scanSourceAtom`                         |
| ROI workspace scan     | —                                            | `roiWorkspaceScanAtom`     | `roiWorkspaceScanAtom`                   |
| Annotation labels      | —                                            | `annotationLabelsAtom`     | `annotationLabelsAtom`                   |
| Label/annotation saves | —                                            | `save*Atom` + invalidation | `save*Atom` + invalidation               |
| Analysis index/CSV     | —                                            | —                          | `analysisResultsAtom`, `analysisCsvAtom` |
| Frame pixels           | `loadFrameEffect`                            | `loadRoiFrameEffect`       | both (align + annotate)                  |
| Align checkpoint       | `saveBbox` / `loadAlignState` (port)         | —                          | same in align step                       |
| Var/auto exclude       | `computeAutoExcludePreview` (`@lisca/utils`) | —                          | same                                     |

**Not query-backed (by design):** frame loads, per-navigation align state, bbox save/list, crop jobs, one-off `readTextFile` / assay saves.

## Family keys

Use `Atom.family` for parameterized queries. Serialize composite keys with `JSON.stringify` when the param is an object (e.g. aligner source, analysis CSV input).

## Reactivity invalidation

Query atoms use `Atom.withReactivity([ReactivityKeys.…])`. Shared key helpers are in `reactivity.ts` (stable string keys). Mutations call `invalidateAfter(effect, [ReactivityKeys.…])` on success so related queries refresh.

## keepAlive vs default

- **`Atom.keepAlive`**: scan sources, ROI workspace scans, annotation labels, analysis CSV/panels — data that should survive param churn within a session.
- **Default (no keepAlive)**: ephemeral UI writable atoms unless persisted manually to `sessionStorage`.

## Result handling in SolidJS

Use helpers from `result-utils.ts`:

```typescript
import { resultData, resultFailureMessage, resultLoading } from "@lisca/client/atoms";

const scan = resultData(useAtomValue(scanSourceAtom(key)));
const loading = resultLoading(useAtomValue(scanSourceAtom(key)));
const error = resultFailureMessage(useAtomValue(scanSourceAtom(key)));
```

Mutations: `useAtomSet(mutationAtom, { mode: "promise" })`.

## App UI atoms

Writable session/UI state stays in each app (`*-ui-atoms.ts` or `*-store.ts` atom-backed hooks). Persist workspace/source via `sessionStorage` + `useAtomInitialValues` on boot (aligner); studio wizard uses the same pattern for assay state.

## Modules

| Module                   | Atoms                                                            |
| ------------------------ | ---------------------------------------------------------------- |
| `aligner/queries.ts`     | `scanSourceAtom` (via `createSourceQueryAtoms`)                  |
| `annotator/queries.ts`   | ROI workspace scan, labels, save labels/annotation               |
| `studio/queries.ts`      | scan source, ROI workspace scan, labels, saves                   |
| `studio/analysis.ts`     | analysis results, analysis CSV text                              |
| `selected-atom-value.ts` | `useSelectedAtomValue` — subscribe to a key-selected Effect Atom |

Frame loading uses `createAlignerFrameLoader` / app `roi-loader` effects — not query atoms.

Panel parsing (CSV → plot panels) stays in `studio-web` because it depends on app-local plot parsers.
