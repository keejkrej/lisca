# 04 — Open the shared Task Center from Aligner

**What to build:** Add a shared, centered Task Center inspired by Chrome's downloads information hierarchy and open it from a persistent Task button among Aligner's top utility actions. The default view stays compact and Operation-oriented, with optional Task/Attempt detail and immediate cancel or retry actions, while the underlying alignment workflow remains available.

**Blocked by:** 03 — Cancel and retry Task attempts.

**Status:** resolved

- [x] Shared headless state derives Operation grouping, active-before-history ordering, bounded progress, statuses, permitted actions, and restrained active/attention indicators from canonical projections.
- [x] Snapshot reconciliation plus the existing live-update or polling infrastructure keeps list and detail state current through shared client IO without raw component fetches or a second mutable task model.
- [x] The centered modal uses LiSCA shell, modal, typography, icon, and component primitives; it references Chrome downloads for scanability rather than branding or pixel imitation.
- [x] The primary list summarizes Operations and does not render hundreds of child Tasks by default; detail reveals Task dependencies, Attempts, structured failures, context, and allowed actions.
- [x] Cancel and retry actions reconcile immediately from the canonical command response and communicate invalid transitions without losing the current list/detail context.
- [x] A persistent Aligner Task button sits with the top utility actions, remains available when no work exists, and indicates active or attention-needed work without becoming an intrusive progress overlay.
- [x] Deterministic headless tests cover all specified aggregate states, action derivation, ordering, attention, history updates, and snapshot/event reconciliation.
- [x] Browser coverage opens and dismisses the centered modal from Aligner and proves the current route, position, selections, and editable workflow remain intact with no blocking overlay, forced navigation, or brittle timeout.
