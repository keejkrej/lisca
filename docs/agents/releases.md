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
