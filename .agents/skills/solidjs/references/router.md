# Solid Router documentation map

Inspect the installed `@solidjs/router` version before choosing APIs. Read conceptual pages for behavior and reference pages for signatures.

| Need                                  | Repository source                                                                        | Published docs                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Installation and router setup         | `src/routes/solid-router/(0)getting-started/`                                            | https://docs.solidjs.com/solid-router/getting-started/installation-and-setup               |
| Navigation and links                  | `src/routes/solid-router/(1)concepts/(0)navigation.mdx`                                  | https://docs.solidjs.com/solid-router/concepts/navigation                                  |
| Params, search params, and catch-alls | `src/routes/solid-router/(1)concepts/`                                                   | https://docs.solidjs.com/solid-router/concepts/path-parameters                             |
| Nested routes and layouts             | `src/routes/solid-router/(1)concepts/(5)nesting.mdx` and `(6)layouts.mdx`                | https://docs.solidjs.com/solid-router/concepts/nesting                                     |
| Actions                               | `src/routes/solid-router/(1)concepts/(8)actions.mdx`                                     | https://docs.solidjs.com/solid-router/concepts/actions                                     |
| Queries and `createAsync`             | `src/routes/solid-router/(3)data-fetching/(0)queries.mdx`                                | https://docs.solidjs.com/solid-router/data-fetching/queries                                |
| Streaming                             | `src/routes/solid-router/(3)data-fetching/(1)streaming.mdx`                              | https://docs.solidjs.com/solid-router/data-fetching/streaming                              |
| Revalidation                          | `src/routes/solid-router/(3)data-fetching/(2)revalidation.mdx`                           | https://docs.solidjs.com/solid-router/data-fetching/revalidation                           |
| Loading and error states              | `src/routes/solid-router/(3)data-fetching/how-to/(1)handle-error-and-loading-states.mdx` | https://docs.solidjs.com/solid-router/data-fetching/how-to/handle-error-and-loading-states |
| Preloading and lazy loading           | `src/routes/solid-router/(4)advanced-concepts/`                                          | https://docs.solidjs.com/solid-router/advanced-concepts/preloading                         |

Exact component, data API, preload, primitive, and response-helper pages live under `src/routes/solid-router/reference/`; open the equivalent page under `docs.solidjs.com/solid-router/reference/`.

When changing route data, account for the query key, arguments, deduplication, preload behavior, cache lifetime, mutation submissions, and every required revalidation. Keep query errors within the intended `ErrorBoundary` and pending reads within the intended `Suspense` boundary.
