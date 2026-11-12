# ADR-0028: Research-area onboarding, two-level assay discovery, and local feedback

- **Status:** accepted
- **Date:** 2026-11-12

## Decision

We will guide first-time Studio users through a two-step research-interest onboarding (`/onboarding`) into a two-level `research area → assay` selector on `/assay`, store personalization and feedback drafts in local browser storage rather than `assay.json` or a telemetry endpoint, and skip automatic `/onboarding` redirects when `VITE_LISCA_MOCK` is active.

## Why

Researchers from LNP delivery, pharmacology, cancer immunology, and expression kinetics approach LiSCA through biological questions rather than internal pipeline names, and an LNP researcher should not have to scan killing workflows to start a run. At the same time, research interests are a discovery aid for the person at the workstation, whereas `assay.json` is the reproducible specification of one Workspace's computation: persisting onboarding choices in `assay.json` would couple analysis files to UI preferences, while hiding "Browse all assays" would trap multi-disciplinary labs.

Keeping `/help-us` ("Help us improve LiSCA") on its own route and storage key (`lisca-studio-feedback`), backed by local drafts, clipboard Markdown export, and pre-filled GitHub issue links, collects structured researcher input without introducing background network telemetry (consistent with ADR-0003) or mixing free-form feedback with Assay filtering. Skipping the `/` → `/onboarding` redirect under `VITE_LISCA_MOCK` preserves ADR-0010's contract that `pnpm run dev:studio-mock` opens `.mock/studio` directly on Metadata.

Rejected alternatives:

- Add `onboarding` or `help-us` to `STUDIO_PAGES` (`⌘1`–`⌘5`): the left rail enumerates the five per-Workspace experiment steps (`Assay` through `Analysis`), not one-time orientation or optional feedback.
- Persist selected research areas in `assay.json`: analysis pipelines depend only on `assay.type` and its typed parameters, never on how the user discovered that assay.
- Post `/help-us` submissions to a remote collector: hosted and desktop Studio builds carry no telemetry service.

## Looks like a bug when

- Opening `/` in a fresh profile navigates to `/onboarding` instead of `/assay`, while `pnpm run dev:studio-mock` bypasses `/onboarding` and opens `/metadata`.
- Selecting "RNA delivery & LNPs" on `/assay` hides the three killing entries until the user clicks "Browse all assays" or "All assays".
- Saving a draft on `/help-us` makes no network request and does not change the active research area filter on `/assay`.
