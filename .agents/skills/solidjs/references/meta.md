# Solid Meta documentation map

Inspect the installed `@solidjs/meta` version first. The unversioned tree documents the current API; the `v1` tree documents the newer v1 API and its migration path.

| Need                              | Repository source                                                        | Published docs                                                             |
| --------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Current installation and setup    | `src/routes/solid-meta/(0)getting-started/(0)installation-and-setup.mdx` | https://docs.solidjs.com/solid-meta/getting-started/installation-and-setup |
| Client setup                      | `src/routes/solid-meta/(0)getting-started/(1)client-setup.mdx`           | https://docs.solidjs.com/solid-meta/getting-started/client-setup           |
| Server setup                      | `src/routes/solid-meta/(0)getting-started/(2)server-setup.mdx`           | https://docs.solidjs.com/solid-meta/getting-started/server-setup           |
| Current component and helper APIs | `src/routes/solid-meta/reference/meta/`                                  | https://docs.solidjs.com/solid-meta/reference/meta/metaprovider            |
| v1 overview and setup             | `src/routes/solid-meta/v1/(0)index.mdx` and `(1)getting-started.mdx`     | https://docs.solidjs.com/solid-meta/v1                                     |
| v0-to-v1 migration                | `src/routes/solid-meta/v1/(2)migrating-from-v0.mdx`                      | https://docs.solidjs.com/solid-meta/v1/migrating-from-v0                   |
| v1 component APIs                 | `src/routes/solid-meta/v1/reference/meta/`                               | https://docs.solidjs.com/solid-meta/v1/reference/meta/head                 |

Keep metadata under the provider required by the selected version. For SSR, verify that server collection, client replacement, and any pre-existing head tags produce deterministic output without duplicate canonical, title, or metadata entries.
