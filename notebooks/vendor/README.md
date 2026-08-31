# Vendor trees for the notebooks zip

`lisca` and `transfection` are assembled here by `scripts/sync-notebooks-vendor.sh`. Do not commit a copy of `python/src` or the transfection sidecar.

- `lisca/` — this repo’s `python/` package (crop extra). Hatch config stays with the package.
- `transfection/` — Python package from `keejkrej/lisca-transfection-assay` at the SHA pinned in `Cargo.lock` and `python/uv.lock`. Rust crates and weights are not copied.

Run the sync script before `uv lock` in `notebooks/`. `scripts/pack-notebooks.sh` runs it so the zip is self-contained: after extract, `uv sync` uses path sources under `vendor/` and only talks to PyPI for third-party wheels.
