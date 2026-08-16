import { createEffect, onCleanup } from "solid-js";

/** Runs `effect` after `delayMs` when `deps` change; clears pending runs on cleanup. */
export function useDebouncedEffect(
  effect: () => void,
  deps: () => readonly unknown[],
  delayMs = 400,
): void {
  createEffect(() => {
    deps();
    const handle = window.setTimeout(() => {
      effect();
    }, delayMs);
    onCleanup(() => window.clearTimeout(handle));
  });
}
