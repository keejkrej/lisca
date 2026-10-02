import {
  resolveKeyboardShortcut,
  type KeyboardShortcut,
  type KeyboardShortcutContext,
} from "@lisca/utils";

import { type StudioPageShortcutPlatform } from "./studio-page-shortcuts";

export type StudioCommandShortcut =
  | "open"
  | "new"
  | "save"
  | "back"
  | "next"
  | "crop"
  | "analyze"
  | "expert"
  | "tasks";

const COMMANDS: Record<
  StudioCommandShortcut,
  { key: string; allowInEditable: boolean; aria: string; label: string }
> = {
  open: { key: "o", allowInEditable: true, aria: "O", label: "O" },
  new: { key: "n", allowInEditable: true, aria: "N", label: "N" },
  save: { key: "s", allowInEditable: true, aria: "S", label: "S" },
  back: { key: "ArrowLeft", allowInEditable: false, aria: "ArrowLeft", label: "←" },
  next: { key: "ArrowRight", allowInEditable: false, aria: "ArrowRight", label: "→" },
  crop: { key: "c", allowInEditable: false, aria: "C", label: "C" },
  analyze: { key: "a", allowInEditable: false, aria: "A", label: "A" },
  expert: { key: "e", allowInEditable: true, aria: "E", label: "E" },
  tasks: { key: "t", allowInEditable: true, aria: "T", label: "T" },
};

export function studioCommandShortcutBindings(
  platform: StudioPageShortcutPlatform,
): readonly KeyboardShortcut[] {
  const modifiers = platform === "mac" ? { meta: true } : { ctrl: true };
  return (
    Object.entries(COMMANDS) as [StudioCommandShortcut, (typeof COMMANDS)[StudioCommandShortcut]][]
  ).map(([command, spec]) => ({
    id: `studio-command-${command}`,
    key: spec.key,
    modifiers,
    allowInEditable: spec.allowInEditable,
    onTrigger() {},
  }));
}

/** App command for a chord, or null when the event is not one. */
export function studioCommandForShortcut(
  context: KeyboardShortcutContext,
  platform: StudioPageShortcutPlatform,
): StudioCommandShortcut | null {
  const key = context.key.length === 1 ? context.key.toLowerCase() : context.key;
  const match = resolveKeyboardShortcut(studioCommandShortcutBindings(platform), {
    ...context,
    key,
  });
  if (!match) return null;
  const command = (Object.keys(COMMANDS) as StudioCommandShortcut[]).find(
    (name) => COMMANDS[name].key === match.key,
  );
  return command ?? null;
}

export function studioCommandShortcutHint(
  command: StudioCommandShortcut,
  platform: StudioPageShortcutPlatform,
): { aria: string; label: string } {
  const spec = COMMANDS[command];
  if (platform === "mac") return { aria: `Meta+${spec.aria}`, label: `⌘${spec.label}` };
  return { aria: `Control+${spec.aria}`, label: `Ctrl+${spec.label}` };
}
