# lisca

## Analysis demo

Iterate on transfection and killing result galleries with fixture PNG plots
(no workspace required):

```sh
vp run dev:studio-demo
```

See `apps/studio/demo/README.md`.

## Workspace fixtures (e2e / agents)

Materialize a sample source folder or a half-finished workspace at a chosen
pipeline step:

```sh
vp run fixture:workspace -- --assay transfection --stage cropped --out /tmp/tf-analyze
```

See `packages/fixtures/README.md`.
