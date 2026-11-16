# ADR-0031: LiSCA owns controls built with UI SDK

- **Status:** accepted
- **Date:** 2026-11-16

## Decision

Maintain LiSCA's shared controls directly and use UI SDK core for interaction behavior, because agent-assisted development lets us shape and verify the controls without a component registry.

## Why

The previous foundation was a complete Zaidan registry snapshot backed by Kobalte, Corvu, and other control libraries. The user chose to replace that registry workflow with owned components and UI SDK. Keep the controls actually used by Studio, Aligner, and Annotator; remove unused catalog implementations and their dependencies.

`@lisca/ui` remains the app-facing interface. Visual tokens, presentation classes, patterns, the shell, and scientific workflow state stay with their existing owners. Native HTML handles simple controls and presentation; UI SDK owns complex interaction such as popups, keyboard selection, focus trapping, and dismissal.

The published `@ui-sdk/solid` beta adapter requires Solid 2; LiSCA uses Solid 1. A local binding in `packages/ui/src/lib/ui-sdk.tsx` renders the framework-independent core. This avoids coupling the UI adoption to a framework migration, but makes the binding our responsibility. Pin the core version and validate its renderer contract when upgrading. A later Solid 2 migration can replace this binding with the official adapter.

Control changes require focused behavior tests and browser checks. Test keyboard and pointer interaction, controlled state, modal nesting, focus restoration, and light/dark appearance; a successful typecheck alone does not establish parity.

## Looks like a bug when

An agent tries to restore `components.json`, refresh controls from Zaidan, or restore the unused catalog. The components are intentionally owned source. A missing accessibility behavior, broken keyboard interaction, or lost visual state is a defect and must be fixed in the shared control or binding.
