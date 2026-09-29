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

/** Route for a page-number chord, or null when the event is not one. */
export function studioPageForShortcut(
  context: KeyboardShortcutContext,
  platform: StudioPageShortcutPlatform,
): StudioRouteTo | null {
  const match = resolveKeyboardShortcut(studioPageShortcutBindings(platform), context);
  if (!match) return null;
  return STUDIO_PAGES.find((page) => String(page.index) === match.key)?.to ?? null;
}
