# Desktop releases

LiSCA uses one release train for its three shipped desktop products. A public tag such as `v0.3.2`
ships Studio, Aligner, and Annotator at version `0.3.2`.

## Versioning policy

- Use [Semantic Versioning](https://semver.org/) and prefix Git tags with `v`.
- Keep the release-bearing manifests for all three desktop products in lockstep:
  - `apps/<product>/desktop/package.json`
  - `apps/<product>/desktop/src-tauri/Cargo.toml`
  - `apps/<product>/desktop/src-tauri/tauri.conf.json`
- Do not give private web apps, servers, helper packages, or shared crates an empty version bump. Their
  versions move only if they are published independently or their own package-version policy requires
  it.
- Private npm workspaces omit `version`; [npm only requires it for published packages](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#name). Desktop `package.json` files are
  the exception because their versions are release metadata.
- Internal Cargo packages declare [`publish = false`](https://doc.rust-lang.org/cargo/reference/manifest.html#the-publish-field). Cargo still requires a SemVer package version, so their versions are
  independent metadata rather than the desktop release version.
- The Python distribution is independently versioned and keeps the static version required by the
  [project metadata standard](https://packaging.python.org/en/latest/specifications/pyproject-toml/#version).
- Never move or reuse a published release tag. If a release fails after its tag is pushed, fix the
  problem on `main` and publish the next patch version.

The release workflow runs `scripts/check-release-version.ts` before it creates a GitHub Release. A tag
whose version differs from any of the nine desktop manifest fields fails without publishing artifacts.

## Release procedure

1. Choose the next SemVer version from the latest stable GitHub Release.
2. Update the nine desktop manifest fields above to the version without the `v` prefix.
3. Run:

   ```sh
   node --experimental-strip-types scripts/check-release-version.ts vX.Y.Z
   vp run fmt:check
   vp run check
   ```

4. Commit and push the version plus release changes to `main`.
5. Wait for the `CI` workflow on that exact commit to succeed.
6. Create and push the tag without moving it later:

   ```sh
   git tag vX.Y.Z
   git push origin refs/tags/vX.Y.Z
   ```

7. Wait for all nine `Release` matrix jobs to succeed, then verify that the GitHub Release contains one
   DMG, one NSIS installer, and one Debian package for each product.

Release notes follow the product version. Internal dependency changes are described in the notes but do
not force unrelated package-version bumps.

## Notebook zip releases

Jupyter notebooks are a second, independent SemVer train. They do not share a version with desktop
installers and must not be hooked into `.github/workflows/release.yml`.

- Desktop tags: `vX.Y.Z` → unsigned Studio, Aligner, and Annotator installers (DMG, NSIS, deb).
- Notebook tags: `notebooks-vX.Y.Z` → one zip, `lisca-notebooks-X.Y.Z.zip`. Workflow:
  `.github/workflows/notebooks-release.yml`.
- `notebooks/VERSION` is the source of truth. The tag `notebooks-v0.1.1` must match `0.1.1` in that
  file (and `notebooks/pyproject.toml`). The workflow fails when they differ.
- Never reuse a notebooks tag. A notebook-only hotfix is the next patch (for example `0.1.2`), not a
  desktop bump and not a moved `notebooks-v0.1.0`.
- Hub and laptop users download the zip. They must not clone this monorepo.
- The zip vendors Lisca crop (`vendor/lisca` from this repo’s `python/`) and the transfection sidecar
  Python package (`vendor/transfection` at the SHA pinned in `Cargo.lock` / `python/uv.lock`).
  `install.sh` only fetches third-party wheels from PyPI. It must not git-clone `keejkrej` packages.
- `scripts/pack-notebooks.sh` runs `scripts/sync-notebooks-vendor.sh` so `notebooks/vendor/` is not a
  committed duplicate of `python/src`. Pack fails if `pyproject.toml` or `uv.lock` still contain
  `git+` / `github.com/keejkrej` sources.

Pack locally with `bash scripts/pack-notebooks.sh`. CI smoke-tests that zip on pull requests; only a
`notebooks-v*` tag publishes a GitHub Release, and that release is zip-only (`make_latest: false` so
it does not replace the latest desktop release). Desktop `v*` / `0.3.2` is a separate train.
