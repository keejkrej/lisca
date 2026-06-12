import { useEffect, useRef } from "react";

/** Runs `effect` after `delayMs` when `deps` change; clears pending runs on cleanup. */
export function useDebouncedEffect(effect: () => void, deps: readonly unknown[], delayMs = 400): void {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      effectRef.current();
    }, delayMs);
    return () => window.clearTimeout(handle);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- caller-owned dependency list
  }, deps);
}
