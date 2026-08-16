import {
  computeFrameViewLayout,
  createFitFrameView,
  type FrameLayout,
  type FrameViewPoint,
  type FrameViewState,
  zoomFrameViewAtPoint,
} from "@lisca/utils";
import { createSignal, type Accessor } from "solid-js";

export type FrameViewSize = {
  width: number;
  height: number;
};

export type FrameViewController = {
  view: Accessor<FrameViewState>;
  layout: (viewportWidth: number, viewportHeight: number, frame: FrameViewSize) => FrameLayout;
  reset: (frame: FrameViewSize) => void;
  syncFrame: (frame: FrameViewSize | null) => void;
  zoomAtCenter: (
    factor: number,
    viewportWidth: number,
    viewportHeight: number,
    frame: FrameViewSize,
  ) => void;
  zoomAtFramePoint: (
    factor: number,
    framePoint: FrameViewPoint,
    viewportWidth: number,
    viewportHeight: number,
    frame: FrameViewSize,
  ) => void;
};

/** Shared ephemeral controller for both assay canvases. */
export function createFrameViewController(): FrameViewController {
  const [view, setView] = createSignal<FrameViewState>({
    zoom: 1,
    centerX: 0,
    centerY: 0,
  });
  let frameSizeKey: string | null = null;

  const reset = (frame: FrameViewSize) => {
    setView(createFitFrameView(frame.width, frame.height));
  };

  const syncFrame = (frame: FrameViewSize | null) => {
    if (!frame) return;
    const nextKey = `${frame.width}x${frame.height}`;
    if (frameSizeKey === nextKey) return;
    frameSizeKey = nextKey;
    reset(frame);
  };

  const layout = (viewportWidth: number, viewportHeight: number, frame: FrameViewSize) =>
    computeFrameViewLayout(viewportWidth, viewportHeight, frame.width, frame.height, view());

  const zoomAtFramePoint = (
    factor: number,
    framePoint: FrameViewPoint,
    viewportWidth: number,
    viewportHeight: number,
    frame: FrameViewSize,
  ) => {
    setView((current) =>
      zoomFrameViewAtPoint(
        current,
        factor,
        framePoint,
        viewportWidth,
        viewportHeight,
        frame.width,
        frame.height,
      ),
    );
  };

  const zoomAtCenter = (
    factor: number,
    viewportWidth: number,
    viewportHeight: number,
    frame: FrameViewSize,
  ) => {
    const currentLayout = layout(viewportWidth, viewportHeight, frame);
    if (!(currentLayout.scale > 0)) return;
    zoomAtFramePoint(
      factor,
      {
        x: (viewportWidth / 2 - currentLayout.drawX) / currentLayout.scale,
        y: (viewportHeight / 2 - currentLayout.drawY) / currentLayout.scale,
      },
      viewportWidth,
      viewportHeight,
      frame,
    );
  };

  return {
    layout,
    reset,
    syncFrame,
    view,
    zoomAtCenter,
    zoomAtFramePoint,
  };
}
