import { Component, Mount, type View } from "@effect/ui";
import type { Html } from "@effect/ui/html";
import type { FrameResult } from "@lisca/utils";
import { Effect, Schema, Stream } from "effect";

import { cn } from "../../lib/utils";
import { panelFrameClass } from "../../patterns/regions/panel";

const PANEL_INSET_PX = 8;

function fitFrameSize(
  containerWidth: number,
  containerHeight: number,
  frameWidth: number,
  frameHeight: number,
) {
  const scale = Math.min(containerWidth / frameWidth, containerHeight / frameHeight);
  return {
    width: Math.max(1, Math.floor(frameWidth * scale)),
    height: Math.max(1, Math.floor(frameHeight * scale)),
  };
}

const SyncFrameAspect = Mount.make(
  "LiscaFrameAspectPanelSync",
  {
    args: {
      frameWidth: Schema.Number,
      frameHeight: Schema.Number,
    },
  },
  (container: HTMLDivElement, initialArgs, changes) =>
    Effect.scoped(
      Effect.gen(function* () {
        let currentWidth = initialArgs.frameWidth;
        let currentHeight = initialArgs.frameHeight;

        const updateSize = () => {
          const panel = container.firstElementChild as HTMLElement | null;
          if (!panel) return;
          if (currentWidth <= 0 || currentHeight <= 0) {
            panel.style.width = "100%";
            panel.style.height = "100%";
            return;
          }
          const fitted = fitFrameSize(
            Math.max(1, container.clientWidth - PANEL_INSET_PX * 2),
            Math.max(1, container.clientHeight - PANEL_INSET_PX * 2),
            currentWidth,
            currentHeight,
          );
          panel.style.width = `${fitted.width + PANEL_INSET_PX * 2}px`;
          panel.style.height = `${fitted.height + PANEL_INSET_PX * 2}px`;
        };

        yield* Effect.acquireRelease(
          Effect.sync(() => {
            updateSize();
            if (typeof ResizeObserver === "undefined") return null;
            const observer = new ResizeObserver(() => updateSize());
            observer.observe(container);
            return observer;
          }),
          (observer) =>
            Effect.sync(() => {
              observer?.disconnect();
            }),
        );

        yield* Stream.runForEach(changes, ({ frameWidth, frameHeight }) =>
          Effect.sync(() => {
            currentWidth = frameWidth;
            currentHeight = frameHeight;
            updateSize();
          }),
        );

        return Component.noop;
      }),
    ),
);

export type FrameAspectPanelOptions<M, R = never> = {
  readonly frame: FrameResult | null;
  readonly class?: string | undefined;
  readonly children?: View.Input<M, R> | undefined;
};

/** Bordered viewport panel sized to a frame's aspect ratio within available space. */
export function FrameAspectPanel<M, R = never>(
  h: Html.H<M>,
  options: FrameAspectPanelOptions<M, R>,
) {
  return h.div
    .class("flex min-h-0 min-w-0 flex-1 items-center justify-center")
    .onMount(
      SyncFrameAspect({
        frameWidth: options.frame?.width ?? 0,
        frameHeight: options.frame?.height ?? 0,
      }),
    )
    .children(
      h.div
        .class(
          cn(
            "relative flex min-h-0 min-w-0 flex-col overflow-hidden p-2",
            panelFrameClass,
            options.class,
          ),
        )
        .children(options.children),
    );
}
