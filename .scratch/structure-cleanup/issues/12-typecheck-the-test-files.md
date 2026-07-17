# 12 — Type-check the test files

**What to build:** 47 of 56 package test files are never type-checked — the `typecheck` tasks run against `tsconfig.build.json`, which excludes tests. So the tests that guard this codebase are themselves unguarded, and a test can reference a symbol that no longer exists without anything failing until it runs. Bring them under type-checking.

**Blocked by:** 02 — Make `vp run check` pass on a clean clone.

**Status:** resolved

- [x] All package test files are type-checked by `vp run check`.
- [x] Errors surfaced by newly type-checking them are fixed, not suppressed — report the count found, since it measures what was hiding.
- [x] The check stays fast enough to keep running on every change; if it does not, say so rather than quietly narrowing scope.
- [x] A test file referencing a nonexistent symbol fails `typecheck`, verified deliberately.

## Resolution evidence

The implementation-time inventory contained 55 package test files: 9 were already type-checked and 46
were newly covered. Enabling that coverage surfaced exactly **22 TypeScript diagnostics across 12 test
files**; all were fixed against the current contracts without suppressions. The package typecheck path
then passed, and a temporary nonexistent export produced the expected `TS2305` failure before the proof
file was removed.

Found by the audit's completeness critic, not by a lens. See PRD critic §2.
