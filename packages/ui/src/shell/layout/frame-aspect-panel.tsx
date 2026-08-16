import type { FrameResult } from "@lisca/utils";
import { createEffect, onCleanup, onMount, splitProps } from "solid-js";

import { cn } from "../../lib/utils";
import { panelFrameClass } from "../regions/panel";

const PANEL_INSET_PX = 8;

type FrameAspectPanelProps = {
  frame: FrameResult | null;
  children?: import("solid-js").JSX.Element;
  class?: string;
};

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

/** Bordered viewport panel sized to a frame's aspect ratio within available space. */
export function FrameAspectPanel(props: FrameAspectPanelProps) {
  const [local] = splitProps(props, ["frame", "children", "class"]);
  let containerEl: HTMLDivElement | undefined;
  let panelEl: HTMLDivElement | undefined;

  const updateSize = () => {
    const container = containerEl;
    const panel = panelEl;
    const frame = local.frame;
    if (!container || !panel) return;

    if (!frame || frame.width <= 0 || frame.height <= 0) {
      panel.style.width = "100%";
      panel.style.height = "100%";
      return;
    }

    const fitted = fitFrameSize(
      Math.max(1, container.clientWidth - PANEL_INSET_PX * 2),
      Math.max(1, container.clientHeight - PANEL_INSET_PX * 2),
      frame.width,
      frame.height,
    );
    panel.style.width = `${fitted.width + PANEL_INSET_PX * 2}px`;
    panel.style.height = `${fitted.height + PANEL_INSET_PX * 2}px`;
  };

  createEffect(() => {
    local.frame;
    updateSize();
  });

  onMount(() => {
    const container = containerEl;
    if (!container) return;
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);
    updateSize();
    onCleanup(() => observer.disconnect());
  });

  return (
    <div ref={containerEl!} class="flex min-h-0 min-w-0 flex-1 items-center justify-center">
      <div
        ref={panelEl!}
        class={cn(
          "relative flex min-h-0 min-w-0 flex-col overflow-hidden p-2",
          panelFrameClass,
          local.class,
        )}
      >
        {local.children}
      </div>
    </div>
  );
}
