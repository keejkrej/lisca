# ADR-0017: User manual lives beside developer docs and ships as GitHub Pages

- **Status:** accepted
- **Date:** 2026-11-03

## Decision

We will publish a user-facing LISCA manual as a MkDocs Material site from
`manual/`, with `mkdocs.yml` setting `docs_dir: manual`, and deploy it to
GitHub Pages on push to `main`. Developer notes and ADRs stay under `docs/`.

## Why

`docs/` already holds agent notes, analysis layout, and ADRs. Replacing that
tree with a public manual would hide the engineering record. A separate
`docs_dir` keeps both trees in the same repository: biologists read the Pages
site, and collaborators keep reading `docs/adr/` and `docs/analysis/`. MkDocs
Material gives search and MathJax for the assay formulae. GitHub Pages is the
public URL next to the GitHub Release installers.

Rejected alternatives:

- Overwrite `docs/` and set that as `docs_dir`. Pages would publish ADRs and
  agent procedure as if they were the product manual.
- Host the manual only as Markdown in the repo. There would be no search, no
  rendered equations, and no stable public URL to cite.
- Put the pages in a separate repository. Assay formulae would drift from the
  code that this repo pins.

## Looks like a bug when

A collaborator opens `docs/` looking for the user manual and finds only ADRs,
or edits an ADR expecting it to appear on the Pages site. The user manual is
`manual/`; Pages builds only that folder.
