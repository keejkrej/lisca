# SolidStart documentation map

## Version gate

Read the installed `@solidjs/start` version first.

- Version 1 documentation lives under `src/routes/solid-start/v1/` and https://docs.solidjs.com/solid-start/v1/.
- Version 2 documentation lives under `src/routes/solid-start/v2/` and https://docs.solidjs.com/solid-start/v2/.
- For a v1-to-v2 migration, begin with `src/routes/solid-start/v2/(2)migrating-from-v1.mdx` or [Migrating from v1](https://docs.solidjs.com/solid-start/v2/migrating-from-v1).

Use `{version}` below as the selected `v1` or `v2` tree.

| Need                                 | Repository source                                                                        | Published docs                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Getting started                      | `src/routes/solid-start/{version}/(1)getting-started.mdx`                                | `https://docs.solidjs.com/solid-start/{version}/getting-started`                              |
| File routing                         | `src/routes/solid-start/{version}/(0)building-your-application/(0)routing.mdx`           | `https://docs.solidjs.com/solid-start/{version}/building-your-application/routing`            |
| API routes                           | `src/routes/solid-start/{version}/(0)building-your-application/(1)api-routes.mdx`        | `https://docs.solidjs.com/solid-start/{version}/building-your-application/api-routes`         |
| Data fetching                        | `src/routes/solid-start/{version}/(0)building-your-application/(3)data-fetching.mdx`     | `https://docs.solidjs.com/solid-start/{version}/building-your-application/data-fetching`      |
| Data mutation                        | `src/routes/solid-start/{version}/(0)building-your-application/(4)data-mutation.mdx`     | `https://docs.solidjs.com/solid-start/{version}/building-your-application/data-mutation`      |
| Head and metadata                    | `src/routes/solid-start/{version}/(0)building-your-application/(5)head-and-metadata.mdx` | `https://docs.solidjs.com/solid-start/{version}/building-your-application/head-and-metadata`  |
| Prerendering and assets              | `src/routes/solid-start/{version}/(0)building-your-application/`                         | `https://docs.solidjs.com/solid-start/{version}/building-your-application/route-prerendering` |
| Middleware and request events        | `src/routes/solid-start/{version}/(1)advanced/`                                          | `https://docs.solidjs.com/solid-start/{version}/advanced/middleware`                          |
| Sessions and auth                    | `src/routes/solid-start/{version}/(1)advanced/(1)session.mdx` and `(5)auth.mdx`          | `https://docs.solidjs.com/solid-start/{version}/advanced/session`                             |
| Security                             | `src/routes/solid-start/{version}/(2)guides/(0)security.mdx`                             | `https://docs.solidjs.com/solid-start/{version}/guides/security`                              |
| Service workers and background tasks | `src/routes/solid-start/{version}/(2)guides/`                                            | `https://docs.solidjs.com/solid-start/{version}/guides/service-workers`                       |

Exact client, configuration, entrypoint, routing, and server APIs live under `src/routes/solid-start/{version}/reference/` and `https://docs.solidjs.com/solid-start/{version}/reference/`.

For server work, account for secret isolation, request scope, serialization, headers/cookies/status timing, redirects, and whether streaming has already started. Keep `window`, `document`, storage, and browser-only libraries behind client boundaries.
