import { Subscription } from "@effect/ui";
import { Effect, Queue, Stream } from "effect";

/**
 * Background color for canvas 2D fills. Inside the instrument shell this is the
 * paper fill, the same surface as the top bar. Otherwise it falls back to `--background`.
 */
export function resolvedCanvasBackground(element?: HTMLElement | null): string {
  const shell = element?.closest(".lisca-instrument-shell");
  if (shell) {
    const paper = getComputedStyle(shell).getPropertyValue("--instrument-paper").trim();
    if (paper) return paper;
  }

  const root = document.documentElement;
  const fromVar = getComputedStyle(root).getPropertyValue("--background").trim();
  if (fromVar) return fromVar;

  if (element) {
    const color = getComputedStyle(element).backgroundColor;
    if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
      return color;
    }
  }

  const rootColor = getComputedStyle(root).backgroundColor;
  if (rootColor && rootColor !== "rgba(0, 0, 0, 0)" && rootColor !== "transparent") {
    return rootColor;
  }

  return root.classList.contains("dark") ? "oklch(0.145 0 0)" : "oklch(1 0 0)";
}

/**
 * Redraws a canvas when the document theme class/style changes.
 * Schedules an initial animation frame, coalesces MutationObserver callbacks
 * onto a single pending animation frame, and cancels any queued frames on cleanup.
 */
export function observeCanvasThemeRerender(rerender: () => void): () => void {
  let initialFrame: number | null = window.requestAnimationFrame(() => {
    initialFrame = null;
    rerender();
  });

  let observerFrame: number | null = null;
  const observer = new MutationObserver(() => {
    if (observerFrame !== null) return;
    observerFrame = window.requestAnimationFrame(() => {
      observerFrame = null;
      rerender();
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  return () => {
    observer.disconnect();
    if (initialFrame !== null) {
      window.cancelAnimationFrame(initialFrame);
      initialFrame = null;
    }
    if (observerFrame !== null) {
      window.cancelAnimationFrame(observerFrame);
      observerFrame = null;
    }
  };
}

/**
 * Effect UI subscription that emits `message` whenever the document theme
 * updates (coalesced per animation frame) and cancels queued work on unmount.
 */
export function canvasThemeRerenderSubscription<M>(key: string, themeMode: string, message: M) {
  return Subscription.make(key, themeMode, () =>
    Stream.callback<M>((queue) => {
      const stop = observeCanvasThemeRerender(() => {
        Queue.offerUnsafe(queue, message);
      });
      return Effect.addFinalizer(() => Effect.sync(stop));
    }),
  );
}
