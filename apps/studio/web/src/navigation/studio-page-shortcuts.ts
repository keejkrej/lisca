import {
  resolveKeyboardShortcut,
  type KeyboardShortcut,
  type KeyboardShortcutContext,
} from "@lisca/utils";

import type { StudioRouteTo } from "./use-studio-navigate";

export const STUDIO_PAGES: readonly { index: number; label: string; to: StudioRouteTo }[] = [
  { index: 1, label: "Assay", to: "/assay" },
  { index: 2, label: "Metadata", to: "/metadata" },
  { index: 3, label: "Align", to: "/align" },
  { index: 4, label: "Annotate", to: "/annotate" },
  { index: 5, label: "Analysis", to: "/analysis" },
];

export type StudioPageShortcutPlatform = "mac" | "other";

/** Mac uses Command. Windows and Linux use Control. */
export function studioPageShortcutPlatform(
  platform = typeof navigator === "undefined" ? "" : navigator.platform,
): StudioPageShortcutPlatform {
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? "mac" : "other";
}

export function studioPageShortcutBindings(
  platform: StudioPageShortcutPlatform,
): readonly KeyboardShortcut[] {
  const modifiers = platform === "mac" ? { meta: true } : { ctrl: true };
  return STUDIO_PAGES.map((page) => ({
    id: `studio-page-${page.index}`,
    key: String(page.index),
    modifiers,
    allowInEditable: true,
    onTrigger() {},
  }));
}

export function studioPageShortcutHint(
  index: number,
  platform: StudioPageShortcutPlatform,
): string {
  return platform === "mac" ? `⌘${index}` : `Ctrl+${index}`;
}

export function studioPageStepHint(
  direction: "up" | "down",
  platform: StudioPageShortcutPlatform,
): string {
  const arrow = direction === "up" ? "↑" : "↓";
  return platform === "mac" ? `⌘${arrow}` : `Ctrl+${arrow}`;
}

function commandModifiers(platform: StudioPageShortcutPlatform): { meta: true } | { ctrl: true } {
  return platform === "mac" ? { meta: true } : { ctrl: true };
}

/**
 * Previous or next rail page for Command/Control+Up/Down.
 * `null` means this is not that chord. `{ to: null }` means the chord matches
 * but the rail is already at that end.
 */
export function studioPageStepTarget(
  context: KeyboardShortcutContext,
  platform: StudioPageShortcutPlatform,
  current: StudioRouteTo,
): { to: StudioRouteTo | null } | null {
  const direction = context.key === "ArrowUp" ? -1 : context.key === "ArrowDown" ? 1 : 0;
  if (direction === 0) return null;
  const match = resolveKeyboardShortcut(
    [
      {
        id: "studio-page-step",
        key: context.key,
        modifiers: commandModifiers(platform),
        allowInEditable: true,
        onTrigger() {},
      },
    ],
    context,
  );
  if (!match) return null;
  const index = STUDIO_PAGES.findIndex((page) => page.to === current);
  if (index < 0) return { to: null };
  return { to: STUDIO_PAGES[index + direction]?.to ?? null };
}

/** Command/Control+Left/Right, outside a text field. The webview uses this chord for history. */
export function studioHorizontalHistoryArrow(
  context: KeyboardShortcutContext,
  platform: StudioPageShortcutPlatform,
): boolean {
  if (context.key !== "ArrowLeft" && context.key !== "ArrowRight") return false;
  return (
    resolveKeyboardShortcut(
      [
        {
          id: "studio-history-arrow",
          key: context.key,
          modifiers: commandModifiers(platform),
          allowInEditable: false,
          onTrigger() {},
        },
      ],
      context,
    ) != null
  );
}

/** Route for a page-number chord, or null when the event is not one. */
export function studioPageForShortcut(
  context: KeyboardShortcutContext,
  platform: StudioPageShortcutPlatform,
): StudioRouteTo | null {
  const match = resolveKeyboardShortcut(studioPageShortcutBindings(platform), context);
  if (!match) return null;
  return STUDIO_PAGES.find((page) => String(page.index) === match.key)?.to ?? null;
}
