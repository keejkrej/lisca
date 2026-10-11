# Design language

LiSCA should feel like a precise scientific instrument: quiet, legible, and direct. Studio, Aligner, and Annotator share one language. The full instrument contract is [`DESIGN.md`](../../DESIGN.md). Shell composition is [shell-ui.md](../ui/shell-ui.md). This page is the short entry for people and agents changing UI.

## Where values live

Edit `packages/design-tokens/src/tokens.ts`, then run `pnpm --filter @lisca/design-tokens generate`. Do not paste a new hex into `packages/ui/theme.css` or a component.

Runtime brand fills are the icon hexes in both color schemes: Studio `#3DDC97`, Aligner `#4EA3FF`, Annotator `#F24B4B`, with ink foreground. `brandOnWhite` in the token source records deepened contrast candidates and is not applied. GFP (`#10B981`) is biological signal. Destructive (`#DC2626`) is errors and irreversible actions. Success stays neutral.

Radius is 0. Outfit Variable is the only application family. Rails are `w-rail` (256px) with a `w-rail-content` column and `ml-rail-inset`. The top bar is `h-topbar` (56px).

## What to reuse

| Need                                                    | Import                                       |
| ------------------------------------------------------- | -------------------------------------------- |
| Button, field, dialog, select, slider                   | `@lisca/ui/button` or `@lisca/ui/primitives` |
| Class names                                             | `@lisca/ui/cn`                               |
| Rail, section, dialog surface, path field, state toggle | `@lisca/ui/patterns`                         |
| Stage frame, navbar, theme, workspace provider          | `@lisca/ui/shell`                            |
| Align, annotate, contrast, file picker, task center     | `@lisca/instrument`                          |

Render `<Button>`. Do not copy `buttonVariants` onto an app element.

Show and Edit are toggles: use `StateToggleIndicator`, `aria-pressed`, and the brand fill only while pressed. Save, Reset, and other momentary actions stay unselected.

Action order in a rail is Save, Back, Next, then Continue. Only Continue uses the primary fill.

## When a local control is allowed

A screen may compose primitives when no pattern exists yet. Promote the composition after a second product surface needs the same rule. Do not add product booleans to a shared pattern. Put the workflow in the app or in `@lisca/instrument`.

## Review

Check light and dark, a narrow viewport, and the empty, loading, and error states the change can reach. `packages/ui/test/theme-brand.test.tsx` locks the per-app brand fills.
