# 02 — Make `vp run check` pass on a clean clone

**What to build:** The repo's own gate has never been green. `vp run check` fails on a fresh checkout because the three `*-desktop#typecheck` tasks run `cargo check -p *-tauri`, whose build script aborts on `resource path 'resources' doesn't exist` — `tauri.conf.json` declares `bundle.resources: { "resources/": "" }`, `.gitignore` ignores that directory, and only `vp run dist:<product>` creates it (and only after a release server binary exists). There is no CI, so nothing catches it. Make the documented gate pass from a clean clone, so agents and humans can distinguish real breakage from this.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] `vp run check` passes on a fresh clone with no prior `dist:` run: 23/23 tasks.
- [x] The fix does not weaken the gate — desktop crates are still type-checked, or their exclusion from `check` is deliberate and documented with the reason.
- [x] `vp run dist:<product>` still produces a working bundle with its resources staged.
- [x] The chosen approach is recorded (committing a `.gitkeep`, making the resource dir optional in the Tauri config, generating it in a pretask, or scoping it out of `check`) with the trade-off stated.

**Note for whoever picks this up:** `vp run check 2>&1 | tail -N` returns tail's exit code, not the check's, and will report success on a hard failure. Do not pipe the gate.

See PRD "Two defects the audit's lenses could not have found".
