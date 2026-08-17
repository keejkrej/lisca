---
version: alpha
name: LiSCA Instrument
description: A precise, quiet instrument interface for scientific image workflows.
colors:
  primary: "#252525"
  primary-foreground: "#FAFAFA"
  background: "#FFFFFF"
  paper: "#FFFFFF"
  foreground: "#171717"
  ink: "#171717"
  muted: "#F5F5F5"
  stage: "#F5F5F5"
  muted-foreground: "#6B6B6B"
  border: "#E5E5E5"
  rule: "#E5E5E5"
  destructive: "#DC2626"
  gfp: "#10B981"
typography:
  display:
    fontFamily: Outfit Variable
    fontSize: 36px
    fontWeight: 700
    lineHeight: 40px
  page:
    fontFamily: Outfit Variable
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
  pane:
    fontFamily: Outfit Variable
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
  section:
    fontFamily: Outfit Variable
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
  control:
    fontFamily: Outfit Variable
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
  body:
    fontFamily: Outfit Variable
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
  path:
    fontFamily: Outfit Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  caption:
    fontFamily: Outfit Variable
    fontSize: 11px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.12em
spacing:
  space-4: 4px
  space-8: 8px
  space-10: 10px
  space-12: 12px
  space-16: 16px
  space-24: 24px
  space-32: 32px
  space-48: 48px
rounded:
  sm: 6px
  md: 8px
  lg: 14px
  xl: 18px
  full: 999px
components:
  stage-shell:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.foreground}"
    width: 1440px
    height: 900px
  stage-rail:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.foreground}"
    width: 256px
  rail-content:
    width: 200px
  main-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    width: 928px
    rounded: "{rounded.xl}"
  top-bar:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    height: 56px
  section-title:
    textColor: "{colors.foreground}"
    typography: "{typography.section}"
  primary-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.full}"
    height: 36px
    padding: 12px
  outline-action:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.full}"
    height: 32px
    padding: 12px
  muted-surface:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  muted-copy:
    backgroundColor: "{colors.background}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body}"
  state-toggle-on:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.full}"
    height: 32px
  destructive-action:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.full}"
    height: 36px
  gfp-indicator:
    backgroundColor: "{colors.gfp}"
    textColor: "{colors.ink}"
    size: 12px
    rounded: "{rounded.full}"
  control-border:
    backgroundColor: "{colors.border}"
    height: 1px
  section-rule:
    backgroundColor: "{colors.rule}"
    height: 1px
  navigation-step:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    size: 32px
    rounded: "{rounded.full}"
  navigation-caret:
    textColor: "{colors.ink}"
    size: 16px
  slider-thumb:
    backgroundColor: "{colors.paper}"
    size: 16px
    rounded: "{rounded.full}"
---

# LiSCA Design Language

## Overview

LiSCA should feel like a precise scientific instrument: quiet, legible, and direct. High-contrast neutral surfaces keep image data primary; restrained GFP green identifies biological signal, not general interaction. The stage shell and all instrument controls use Outfit Variable.

Studio, Aligner, and Annotator share this language. Reuse the same shell, section, field, navigation, toggle, slider, and action primitives rather than introducing app-local variants.

## Colors

- **Stage and muted (`#F5F5F5`):** the desktop surround and low-emphasis surfaces.
- **Background and paper (`#FFFFFF`):** the top bar, sheets, inputs, and canvas framing.
- **Foreground and ink (`#171717`):** default text, icons, and navigation carets.
- **Primary (`#252525`) / primary foreground (`#FAFAFA`):** active controls and the highest-emphasis action.
- **Muted foreground (`#6B6B6B`):** metadata and secondary values; never primary labels. It remains AA-readable on the muted stage.
- **Border and rule (`#E5E5E5`):** control outlines and quiet separators.
- **Destructive (`#DC2626`):** irreversible or error states only.
- **GFP (`#10B981`):** biological GFP signal and its legend only.

## Typography

Outfit Variable is the only application family. Use the semantic tokens without local resizing: display for hero data, page for workspace titles, pane for sheet and dialog titles, section for collapsible rail headings, control for field labels and controls, body for explanatory and rail copy, path for compact paths and indices, and tracked caption for metadata.

Section hierarchy is mandatory: a rail section title is 14px/20px semibold, while its labels and controls are 12px/16px medium. A section title must never be equal to or smaller than its contents.

## Layout

The reference desktop stage is 1440px by 900px with 16px vertical stage visible. Its fixed columns are 256px / 928px / 256px. The center column begins with a 56px top bar and uses a 12px gap before the main sheet. Each rail centers a 200px content column horizontally. Vertically center a rail stack only while its complete contents fit; when it overflows, align it to block-start and let the rail own scrolling so the first control remains reachable. The scrolling viewport spans the full 256px rail so its scrollbar occupies the outer gutter and never overlays the 200px control column. Use 16px between independently collapsible sections and 8px between controls within a section.

Scrollable main documents use a full-sheet viewport with a separately centered content measure. The constrained form or result column never owns overflow, so its scrollbar stays at the outer edge of the 928px sheet instead of crossing fields or row actions. Use a nested local scroller only when the nested region is an independently navigable bounded widget, such as a file list or task queue.

Rail density follows task relationships, not a global one- or two-column rule. Full-width controls are required for tools, segmented controls, primary or destructive actions, user-authored text, long labels, and unrelated commands. Exactly two short product-authored controls may share a named action pair only when they have the same task scope and comparable visual weight. The sole state/action exception is Edit/Reset when Edit keeps its persistent state indicator. At the canonical 200px measure, a pair uses two 96px cells with an 8px gutter and stacks below 200px without changing DOM or focus order. Never truncate a product command to make a pair fit; user-authored labels always remain full width. Semantic coordinate and dimension fields use the stricter paired-field pattern: only X/Y or Width/Height members with the same noun, unit, validation, and lifecycle.

Rail sections follow task order, not implementation order. In Aligner, Geometry mirrors Tool: Offset X/Y for Pan, Rotation for Rotate, Spacing X/Y for Zoom spacing, then Pattern Width/Height for Zoom pattern. Magnifier is view-only and therefore has no Geometry field.

At narrower widths, preserve the center workspace and move rails into body-owned overlays. Do not duplicate or remount stateful rail content when an overlay opens.

## Elevation & Depth

Use tonal layering, rules, and one restrained stage elevation. Muted stage rails stay flat; the white top bar and main sheet use `0 1px 2px #0000000A, 0 8px 24px #0000000F`. Dialogs may use a scrim, but their surface stays flat and uses the 18px radius. Avoid ad hoc shadows and floating-card stacks.

## Shapes

Use 6px and 8px radii for compact surfaces, 14px for secondary cards, and 18px for the main sheet and dialogs. Buttons, toggles, chips, navigation circles, and slider thumbs use the 999px pill/circle radius. Shapes communicate grouping and state; do not mix arbitrary radii in one control family.

## Components

Use the installed Zaidan Maia catalog through `@lisca/ui/components` before creating a new primitive. Product code must not deep-import registry files or hand-roll a control already covered by the catalog. Keep LiSCA behavior and composition in shared feature or shell modules; refresh registry-owned primitives through `packages/ui/components.json` instead of editing their generated implementation ad hoc.

State controls and actions must be distinguishable before interaction. **Show** and **Edit** are toggles: always render a persistent state indicator, set `aria-pressed`, and use the dark primary fill only when on. Save, Reset, Auto Range, Undo, and exclusion commands are momentary actions: never leave them looking selected.

Grid **Show / Reset** is a named two-column action pair: both labels are short, they share one grid-visibility task scope, and Show retains its persistent state indicator. This is the canonical toggle/reset exception to the full-width rule.

Expert mode is a workspace-level setting. Show its compact checkmark toggle (same Show/Edit family: persistent indicator, `aria-pressed`, dark primary fill when on) in the Studio top bar only on routes that provide an expert view. It sits immediately after Tasks in the left cluster; the right cluster contains only Connected and theme. Never place Expert at the bottom of a scrolling rail.

Read-only source and workspace paths are full-width picker triggers, not editable inputs. The complete surface opens the picker and always exposes the same trailing **Browse** action so identical behavior has an identical affordance.

Control height follows placement, not visual variant. Rail buttons and toggles are 32px whether solid, outline, or destructive. Main-form and dialog actions are 36px. Use a larger size only when a named component recipe explicitly requires it.

Tool rows are full-width and ordered by the operation they affect. Aligner uses Pan, Rotate, Zoom spacing, Zoom pattern, then Magnifier. Annotator appends Magnifier after its edit tools. Magnifier is always the bottom tool, operates on the view only, and never mutates a grid, mask, annotation, or saved output. Independent locks sit with Zoom spacing and Zoom pattern.

Previous/next controls use the same regular caret family as section-collapse controls, rendered at 16px in dark ink and optically centered inside 32px circular buttons. Do not use text glyph arrows. Every slider renders a visible 16px circular thumb, including endpoint values.

App mapping:

- **Aligner:** left rail contains Navigation, Contrast, and Tool; right rail contains Grid, Geometry, Selection, and Action.
- **Annotator:** left rail contains Navigation, Contrast, and segmentation Tool; right rail contains Mode, Labels, Edit, optional Brush, and Action.
- **Studio:** left rail owns workflow navigation, center owns the active task, and right rail owns instruction/basic/expert controls. Embedded align and annotate stages reuse the standalone component rules, names, and order.

Action is the final rail section. Output-path and included/excluded count labels stay out of the compact rail unless they are required to make the next action safe.

## Do's and Don'ts

- Do keep section titles visibly above control text in the hierarchy.
- Do use full-width stacks for tool rows, primary actions, destructive actions, long labels, and unrelated controls.
- Do use a named action pair for exactly two short product-authored commands with one task scope.
- Do preserve the 200px rail measure and 8px paired-field gutter across all three apps.
- Do expose toggle state persistently and give every icon-only control an accessible name.
- Do check `@lisca/ui/components` before adding a product-local primitive.
- Do keep image navigation, overlays, and hit testing on the same viewport transform.
- Don't use fallback or mixed font families inside the application interface.
- Don't hand-roll or deep-import a control already provided by the installed Zaidan Maia catalog.
- Don't pair controls with unrelated scope, mismatched emphasis, user-authored text, or labels that cannot scan comfortably in 96px.
- Don't style a momentary action as selected, or a toggle as an ordinary outline action.
- Don't use ad hoc shadows, text-glyph arrows, invisible slider thumbs, or app-specific control geometry.
- Don't use GFP green as a generic success or primary-action color.
