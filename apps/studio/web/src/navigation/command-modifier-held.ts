import { Subscription } from "@effect/ui";
import { Effect, Queue, Stream } from "effect";

import { studioPageShortcutPlatform } from "./studio-page-shortcuts";

let held = false;
let listening = false;
const listeners = new Set<(value: boolean) => void>();

function platformModifierDown(event: KeyboardEvent): boolean {
  return studioPageShortcutPlatform() === "mac" ? event.metaKey : event.ctrlKey;
}

function setHeld(next: boolean): void {
  if (held === next) return;
  held = next;
  for (const listener of listeners) {
    listener(held);
  }
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
  return held;
}

/** Subscribes to Command/Control held state changes. */
export function subscribeCommandModifierHeld(listener: (value: boolean) => void): () => void {
  ensureCommandModifierListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Effect UI subscription that emits `toMessage(held)` on Command/Control press/release. */
export function commandModifierHeldSubscription<M>(key: string, toMessage: (held: boolean) => M) {
  return Subscription.make(key, "cmd-modifier", () =>
    Stream.callback<M>((queue) => {
      const stop = subscribeCommandModifierHeld((next) => {
        Queue.offerUnsafe(queue, toMessage(next));
      });
      return Effect.addFinalizer(() => Effect.sync(stop));
    }),
  );
}
