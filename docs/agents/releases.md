# Desktop releases

Each desktop app has its own version and its own release. A tag ships one app for macOS, Windows, and Linux:

| Tag                | App       |
| ------------------ | --------- |
| `studio-vX.Y.Z`    | Studio    |
| `aligner-vX.Y.Z`   | Aligner   |
| `annotator-vX.Y.Z` | Annotator |

Local `pnpm run dist:studio`, `dist:aligner`, and `dist:annotator` stay available and do not publish a release.

## Versioning policy

- Use [Semantic Versioning](https://semver.org/). Studio tags are `studio-vX.Y.Z`. Aligner tags are `aligner-vX.Y.Z`. Annotator tags are `annotator-vX.Y.Z`. Notebook tags are `notebooks-vX.Y.Z` and ship from their own workflow.
- Published tags `v0.4.8` and `v0.4.9` stay as they are. Do not move them. The next Studio release is `studio-vX.Y.Z`.
- Bump only the three desktop manifests of the app you are releasing:
  - `apps/<app>/desktop/package.json`
  - `apps/<app>/desktop/src-tauri/Cargo.toml`
  - `apps/<app>/desktop/src-tauri/tauri.conf.json`
- Leave the other apps at their own versions. A Studio release does not ship Aligner or Annotator.
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
whose version differs from any of that app's three desktop manifest fields fails without publishing artifacts.

## Release procedure

1. Choose the app and the next SemVer version from that app's latest stable GitHub Release.
2. Update that app's three desktop manifest fields to the version without the tag prefix.
3. Run the check for that tag:

   ```sh
   node --experimental-strip-types scripts/check-release-version.ts studio-vX.Y.Z
   node --experimental-strip-types scripts/check-release-version.ts aligner-vX.Y.Z
   node --experimental-strip-types scripts/check-release-version.ts annotator-vX.Y.Z
   pnpm run fmt:check
   pnpm run check
   ```

   Run the one command whose tag you are about to push.

4. Commit and push the version plus release changes to `main`.
5. Wait for the `Checks` workflow on that exact commit to succeed.
6. Create and push the tag without moving it later:

   ```sh
   git tag studio-vX.Y.Z
   git push origin refs/tags/studio-vX.Y.Z
   ```

   Use `aligner-vX.Y.Z` or `annotator-vX.Y.Z` when releasing those apps. A bare `vX.Y.Z` tag does not publish a desktop app.

7. Wait for the three package jobs and `publish-updater-manifest` to succeed. The versioned GitHub
   Release contains one DMG, one NSIS installer, and one Debian package, plus the updater signatures.
   Tauri names the macOS updater archive `<Product>.app.tar.gz` with no architecture. The macOS
   package job copies it to `<Product>_aarch64.app.tar.gz` before upload, because that runner is
   Apple silicon. The app's feed (`studio-update`, `aligner-update`, or `annotator-update`) then
   holds `latest.json`. That feed release is not the GitHub Latest release.

## Channels

Two channels. There is no nightly. One machine has one install, and that install is one channel.

- **Stable** is a product tag (`studio-v*`, `aligner-v*`, or `annotator-v*`). `.github/workflows/release.yml` publishes that app's GitHub Release and its update feed. An installed app checks its own feed once at startup. It downloads nothing until the user chooses Install. Settings can turn the check off. It does not look at test artifacts, notebook zips, or the other apps' feeds.
- **Test** is `.github/workflows/desktop-build.yml` (`Desktop build`, `workflow_dispatch`). It packages Studio with the same signing and notarization and uploads an Actions artifact. It does not create a tag, a GitHub Release, or an updater manifest. A test install looks for nothing. Replace it by installing another artifact by hand.

Updater signatures use the `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` Actions secrets. The matching public key is in each app's `tauri.conf.json`. Keep a copy of the private key outside the repo. Losing it means installed apps cannot verify a later update.

Run Desktop build from the Actions tab on the branch you want to try. The `os` input is `macos` (default), `windows`, `linux`, or `all`.

```sh
gh workflow run desktop-build.yml --ref <branch> -f os=macos
gh run watch
gh run download --name studio-macos-<shortsha>
```

Artifacts are kept for 14 days. The file name includes the short commit (`studio-macos-237b3fa.dmg`). The version inside the bundle stays the version in the Studio manifests. Packaging for both channels lives in `.github/workflows/desktop-package.yml`.

GitHub lists `workflow_dispatch` workflows only after they are on `main`. Merge the workflow, then run it. `--ref` selects the commit to package; the workflow file itself comes from `main`.

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

Jupyter notebooks are their own SemVer train. They do not share a version with Studio, Aligner, or
Annotator, and they must not be hooked into `.github/workflows/release.yml`.

- Desktop tags: `studio-vX.Y.Z`, `aligner-vX.Y.Z`, and `annotator-vX.Y.Z`. Each publishes that app's installers (signed and notarized DMG, unsigned NSIS, deb).
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
tags (`studio-v*`, `aligner-v*`, `annotator-v*`) are a separate train. The notebooks version in this
tree is `notebooks/VERSION`.
