# Core Solid documentation map

Read the smallest set of primary pages that covers the task. Paths are relative to this documentation repository; URLs are the installed skill's portable fallback.

## Mental model and components

| Need                     | Repository source                                                | Published docs                                                     |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| Fine-grained reactivity  | `src/routes/(1)advanced-concepts/(0)fine-grained-reactivity.mdx` | https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity |
| Signals                  | `src/routes/(0)concepts/(2)signals.mdx`                          | https://docs.solidjs.com/concepts/signals                          |
| Component execution      | `src/routes/(0)concepts/(0)components/(0)basics.mdx`             | https://docs.solidjs.com/concepts/components/basics                |
| Props and prop utilities | `src/routes/(0)concepts/(0)components/(2)props.mdx`              | https://docs.solidjs.com/concepts/components/props                 |
| JSX tracking behavior    | `src/routes/(0)concepts/(1)understanding-jsx.mdx`                | https://docs.solidjs.com/concepts/understanding-jsx                |
| Context                  | `src/routes/(0)concepts/(4)context.mdx`                          | https://docs.solidjs.com/concepts/context                          |
| Refs                     | `src/routes/(0)concepts/(6)refs.mdx`                             | https://docs.solidjs.com/concepts/refs                             |

## Derivation, effects, and state

| Need                       | Repository source                                                 | Published docs                                                   |
| -------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| Derived signals            | `src/routes/(0)concepts/(2)derived-values/(0)derived-signals.mdx` | https://docs.solidjs.com/concepts/derived-values/derived-signals |
| Memos                      | `src/routes/(0)concepts/(2)derived-values/(1)memos.mdx`           | https://docs.solidjs.com/concepts/derived-values/memos           |
| Effects                    | `src/routes/(0)concepts/(3)effects.mdx`                           | https://docs.solidjs.com/concepts/effects                        |
| Stores                     | `src/routes/(0)concepts/(5)stores.mdx`                            | https://docs.solidjs.com/concepts/stores                         |
| Complex state              | `src/routes/(2)guides/(3)complex-state-management.mdx`            | https://docs.solidjs.com/guides/complex-state-management         |
| Cleanup                    | `src/routes/reference/lifecycle/on-cleanup.mdx`                   | https://docs.solidjs.com/reference/lifecycle/on-cleanup          |
| Tracking control with `on` | `src/routes/reference/reactive-utilities/on-util.mdx`             | https://docs.solidjs.com/reference/reactive-utilities/on-util    |
| Intentional untracking     | `src/routes/reference/reactive-utilities/untrack.mdx`             | https://docs.solidjs.com/reference/reactive-utilities/untrack    |

## UI and async behavior

| Need                      | Repository source                                                     | Published docs                                                       |
| ------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Conditional rendering     | `src/routes/(0)concepts/(1)control-flow/(0)conditional-rendering.mdx` | https://docs.solidjs.com/concepts/control-flow/conditional-rendering |
| List rendering            | `src/routes/(0)concepts/(1)control-flow/(1)list-rendering.mdx`        | https://docs.solidjs.com/concepts/control-flow/list-rendering        |
| Error boundaries          | `src/routes/(0)concepts/(1)control-flow/(3)error-boundary.mdx`        | https://docs.solidjs.com/concepts/control-flow/error-boundary        |
| Data fetching             | `src/routes/(2)guides/(4)fetching-data.mdx`                           | https://docs.solidjs.com/guides/fetching-data                        |
| `createResource`          | `src/routes/reference/basic-reactivity/create-resource.mdx`           | https://docs.solidjs.com/reference/basic-reactivity/create-resource  |
| `Suspense`                | `src/routes/reference/components/suspense.mdx`                        | https://docs.solidjs.com/reference/components/suspense               |
| Server and hydration APIs | `src/routes/reference/rendering/`                                     | https://docs.solidjs.com/reference/rendering/render-to-string        |

## Testing and exact APIs

Use `src/routes/(2)guides/(5)testing.mdx` or https://docs.solidjs.com/guides/testing for Vitest, Solid Testing Library, user-event, portals, resources, and accessible queries.

For exact primitive signatures, locate the matching page under `src/routes/reference/` and open its equivalent path on `docs.solidjs.com`. Prefer the installed `solid-js` type declarations when the project version differs from the docs.
