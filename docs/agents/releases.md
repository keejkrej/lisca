# Desktop releases

LiSCA uses one release train for Studio. A public tag such as `v0.3.2` ships Studio
installers for macOS, Windows, and Linux at version `0.3.2`. Local
`pnpm run dist:aligner` and `pnpm run dist:annotator` remain available for those apps.

## Versioning policy

- Use [Semantic Versioning](https://semver.org/) and prefix Git tags with `v`.
- Keep the release-bearing Studio desktop manifests in lockstep:
  - `apps/studio/desktop/package.json`
  - `apps/studio/desktop/src-tauri/Cargo.toml`
  - `apps/studio/desktop/src-tauri/tauri.conf.json`
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
whose version differs from any of the three Studio desktop manifest fields fails without publishing artifacts.

## Release procedure

1. Choose the next SemVer version from the latest stable GitHub Release.
2. Update the three Studio desktop manifest fields above to the version without the `v` prefix.
3. Run:

   ```sh
   node --experimental-strip-types scripts/check-release-version.ts vX.Y.Z
   pnpm run fmt:check
   pnpm run check
   ```

4. Commit and push the version plus release changes to `main`.
5. Wait for the `Checks` workflow on that exact commit to succeed.
6. Create and push the tag without moving it later:

   ```sh
   git tag vX.Y.Z
   git push origin refs/tags/vX.Y.Z
   ```

7. Wait for the three `Release` matrix jobs (Studio on macOS, Windows, and Linux) to succeed, then
   verify that the GitHub Release contains one DMG, one NSIS installer, and one Debian package.

## macOS signing

macOS DMGs are signed with the Developer ID Application certificate and notarized in the `Release`
workflow. A macOS job fails before packaging if any of these Actions secrets is missing:

| Secret                       | Value                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `APPLE_CERTIFICATE`          | Base64 of the exported Developer ID Application `.p12` (`base64 -i cert.p12`) |
| `APPLE_CERTIFICATE_PASSWORD` | Password chosen when exporting the `.p12`                                     |
| `APPLE_SIGNING_IDENTITY`     | `Developer ID Application: Name (TEAMID)`                                     |
| `APPLE_ID`                   | Apple Account email of the developer team member                              |
| `APPLE_PASSWORD`             | App-specific password from account.apple.com                                  |
| `APPLE_TEAM_ID`              | 10-character team ID                                                          |

Local `pnpm run dist:<product>` builds without these variables stay unsigned. Do not distribute them
through a browser download: Gatekeeper reports quarantined unsigned bundles as damaged.

Release notes follow the product version. Internal dependency changes are described in the notes but do
not force unrelated package-version bumps.

## Notebook zip releases

Jupyter notebooks are a second, independent SemVer train. They do not share a version with desktop
installers and must not be hooked into `.github/workflows/release.yml`.

- Desktop tags: `vX.Y.Z` → Studio installers (signed and notarized DMG, unsigned NSIS, deb).
- Notebook tags: `notebooks-vX.Y.Z` on the **export commit** of branch `notebooks` (not `main`).
  Asset: `lisca-notebooks-X.Y.Z.zip`. Workflow: `.github/workflows/release-jupyternotebook.yml`.
- Bump `notebooks/VERSION` (and `notebooks/pyproject.toml`) on **`main`**. Daily work never lands on
  `notebooks`. Branch `notebooks` is an export artifact equivalent to the zip.
- After merge, `workflow_dispatch` release-jupyternotebook with that SemVer. The job packs from **main**,
  publishes the packed tree to `notebooks` with `--tag` (`notebooks-vX.Y.Z` on the export commit),
  then creates the GitHub Release. Do not tag a main monorepo commit. Do not push branch `notebooks`
  from merges or PRs. Do not add a sync from main.
- Preferred user get (always clone branch `notebooks`):
  `curl -fsSL https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.sh | bash`
  Windows: `irm https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.ps1 | iex`.
  Scripts clone into **PWD** only (default `./lisca-notebooks`; optional arg is the folder
  name or path). Never `~/.local/share`, `~/Library`, or other user-global tool dirs.
  Always bootstraps portable git under `.tools/git` (does not use system git). `.uv`
  (including managed Python) stays in that folder. Scripts do not zip-extract. The GitHub
  Release still attaches `lisca-notebooks-X.Y.Z.zip` for a manual download; scripts do not
  treat that zip as a get/update path.
- Update: `bash update.sh` uses the same portable git under `.tools/git`. No `.git` → bootstrap onto
  branch `notebooks` (`.venv` / `.uv` / `.tools` kept). Already on `notebooks` → untracked copies such as
  `notebooks/crop_exp1.ipynb` are kept (never backed up or `git clean`ed). If a tracked template is
  dirty, sibling `<stem>.backup-<UTC>.ipynb` (for example `crop.backup-20260901T130000Z.ipynb`) then
  `git fetch` + `reset --hard origin/notebooks` (other local files discarded; untracked cleaned except
  `.venv` / `.uv` / `.tools` / `notebooks/*.ipynb` / `notebooks/*.backup-*.ipynb`). Clean trees and
  additive-only copies use `git pull --ff-only`. Then `uv sync`. Update does not download a notebooks
  zip and does not pull `main`.
- Never reuse a notebooks tag. A notebook-only hotfix is the next patch (for example `0.1.2`), not a
  desktop bump and not a moved `notebooks-v0.1.0`.
- The export vendors Lisca crop (`vendor/lisca` from this repo’s `python/`) and the transfection
  sidecar Python package (`vendor/transfection` at the SHA pinned in `Cargo.lock` / `python/uv.lock`).
  `install.sh` only fetches third-party wheels from PyPI. It must not git-clone `keejkrej` packages.
- `scripts/pack-notebooks.sh` runs `scripts/sync-notebooks-vendor.sh` so `notebooks/vendor/` is not a
  committed duplicate of `python/src` **on main**. Pack fails if `pyproject.toml` or `uv.lock` still
  contain `git+` / `github.com/keejkrej` sources.

Pack locally with `bash scripts/pack-notebooks.sh`. CI smoke-tests that zip on pull requests. Desktop
`v*` / `0.3.2` is a separate train.
