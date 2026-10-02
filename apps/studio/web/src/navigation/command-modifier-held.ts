import { createSignal } from "solid-js";

import { studioPageShortcutPlatform } from "./studio-page-shortcuts";

const [held, setHeld] = createSignal(false);
let listening = false;

function platformModifierDown(event: KeyboardEvent): boolean {
  return studioPageShortcutPlatform() === "mac" ? event.metaKey : event.ctrlKey;
}

function ensureCommandModifierListener(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const sync = (event: KeyboardEvent) => setHeld(platformModifierDown(event));
  window.addEventListener("keydown", sync, true);
  window.addEventListener("keyup", sync, true);
  window.addEventListener("blur", () => setHeld(false));
}

/** True while Command (macOS) or Control (elsewhere) is held. */
export function commandModifierHeld(): boolean {
  ensureCommandModifierListener();
  return held();
}
