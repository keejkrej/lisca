# Effect, Effect Atom, and SolidJS state

LiSCA uses each reactive tool at a different seam. The goal is not to make every operation an
Effect or every value an atom; it is to keep ownership and cancellation unambiguous.

## Ownership rules

| Concern                                   | Owner                     | Why                                                             |
| ----------------------------------------- | ------------------------- | --------------------------------------------------------------- |
| Wire schemas and HTTP contracts           | Effect Schema / `HttpApi` | Runtime validation and one typed client contract                |
| Client I/O and multi-step async workflows | Effect                    | Typed failures, interruption, parallelism, retries, and tracing |
| Shared remote queries and mutations       | Effect Atom               | Registry-scoped caching, result states, and invalidation        |
| App/session state shared across routes    | Writable Effect Atom      | One registry-owned value with explicit actions and persistence  |
| Component or hook-local transient state   | Solid `createSignal`      | The owner and lifetime are already the Solid owner              |
| Derived view state                        | Solid `createMemo`        | It should not become another writable source of truth           |

Use the deletion test: an Effect or atom wrapper should hide real behavior. A wrapper that only
forwards one concrete dependency is a shallow module and should be removed.

## Runtime

App ports are concrete adapters captured by the atom factories. The Effect Atom runtime only
provides the Effect reactivity module:

```typescript
import { createAlignerQueryAtoms, createAppRuntime } from "@lisca/client/atoms";

export const runtime = createAppRuntime();
export const { scanSourceAtom } = createAlignerQueryAtoms(runtime, port);
```

Do not add a `Context.Tag` and `Layer` for a port unless the Effect program actually has multiple
adapters selected through its environment. Tests can pass a fake port directly to the factory.

## Cross-product data access

**Query atoms** cache shared reads and use `ReactivityKeys`. Inactive family members have a
five-minute idle TTL: this preserves short navigation churn without retaining every source,
workspace, or CSV key for the lifetime of the app.

**Mutation atoms** write through the port and call `invalidateAfter` so related queries refresh.

**Imperative port calls** (`runClientEffect(client.*)`) handle ephemeral loads, explicit
checkpoints, and long-running jobs. Cancellation is attached once, where an Effect is executed as
a Promise. Effect-returning ports do not also accept `AbortSignal`; fiber interruption propagates
to the HTTP client.

| Concern                | Aligner                    | Annotator                  | Studio                                   |
| ---------------------- | -------------------------- | -------------------------- | ---------------------------------------- |
| Source scan            | `scanSourceAtom`           | —                          | `scanSourceAtom`                         |
| ROI workspace scan     | —                          | `roiWorkspaceScanAtom`     | `roiWorkspaceScanAtom`                   |
| Annotation labels      | —                          | `annotationLabelsAtom`     | `annotationLabelsAtom`                   |
| Label/annotation saves | —                          | `save*Atom` + invalidation | `save*Atom` + invalidation               |
| Analysis index/CSV     | —                          | —                          | `analysisResultsAtom`, `analysisCsvAtom` |
| Frame pixels           | `loadFrameEffect`          | `loadRoiFrameEffect`       | both                                     |
| Align checkpoint       | port Effect                | —                          | port Effect                              |
| Crop/analysis progress | interruptible Effect fiber | —                          | interruptible Effect fiber               |

Frame loads, per-navigation align state, bbox save/list, crop jobs, and one-off file or assay saves
are deliberately not query-backed.

## Family keys and invalidation

Use `Atom.family` for parameterized queries. Serialize composite keys with `JSON.stringify` when
the parameter is an object. Query atoms use `Atom.withReactivity([ReactivityKeys.…])`; successful
mutations call `invalidateAfter(effect, [ReactivityKeys.…])`.

## Effect Atom versus Solid signals

Use a writable Effect Atom when state must outlive one Solid owner, be read by unrelated routes,
or be initialized at the app registry. App/session atoms use `Atom.keepAlive` intentionally because
the registry, not a route component, owns their lifetime. Persistence still belongs in explicit
actions or boot hydration.

Use a Solid signal for dialog visibility, in-flight UI affordances, draft values, and other state
owned by one component or session hook. Keep derived values in memos. Do not promote local state to
an atom merely to avoid prop passing, and do not mirror an atom into a long-lived signal.

`useSelectedAtomValue` is the narrow adapter for a Solid-reactive family key: it unsubscribes from
the old Effect Atom and subscribes to the newly selected one under the current registry.

## Result handling

Use helpers from `result-utils.ts`:

```typescript
const data = resultData(queryResult());
const loading = resultLoading(queryResult());
const error = resultFailureMessage(queryResult());
```

Run mutation atoms with `useAtomSet(mutationAtom, { mode: "promise" })` when an event handler needs
to await the result.
