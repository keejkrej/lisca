# ADR-0029: The research guide is optional browsing without personalization

- **Status:** accepted
- **Date:** 2026-11-13
- **Supersedes:** [ADR-0028](0028-research-area-onboarding-and-assay-discovery.md)

## Decision

We will make onboarding an optional research guide that shows every research area and saves no research interests or completion profile, while the Assay page provides temporary research-field filters, because browsing capabilities and workflows does not require learning about the user.

## Why

The user clarified that browsing research questions, sample figures, and methods should not personalize the welcome screen. Studio therefore starts on Assay and exposes the guide through the Research guide action beside Help us improve LiSCA in the main section, and directly at `/onboarding`. These browsing links do not occupy the action sidebar. Opening the guide or returning from it does not select an assay. An explicit Use assay action can select that workflow in an untouched blank assay; it preserves an edited or saved assay.

The previous questionnaire, first-visit redirect, and persisted research interests are removed. Profiles saved by older versions are ignored. Assay offers two fields: LNP delivery (LNP transfection followed by LNP binding) and Cell killing (death reporter, engagement, and the unavailable label-free preview). There is no All assays option. The page opens on the selected assay's field, defaulting to LNP delivery for a blank assay. Switching fields changes only the displayed workflows, leaves the selected assay unchanged, and is not remembered when the page is reopened. The user clarified that separating these two fields remains necessary, even though those browsing choices must not become saved interests.

The scientific guide content and the separate, optional feedback draft and GitHub issue flow from ADR-0028 remain available; feedback is saved only through an explicit action and does not personalize Studio.

## Looks like a bug when

- A fresh browser starts on Assay rather than a research-interest questionnaire.
- A user opens the guide repeatedly and sees every research area each time.
- An old saved research-interest profile no longer filters the available assays.
- Choosing Use LNP binding returns to the LNP delivery field, with Cell killing available separately.
- Browsing Cell killing while an LNP assay is selected, then reopening Assay, returns to LNP delivery.
