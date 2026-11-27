import {
  computeFrameViewLayout,
  createFitFrameView,
  type FrameLayout,
  type FrameViewPoint,
  type FrameViewState,
  zoomFrameViewAtPoint,
} from "@lisca/utils";

export type FrameViewSize = {
  width: number;
  height: number;
};

export type FrameViewListener = (view: FrameViewState) => void;

export type FrameViewController = {
  view: () => FrameViewState;
  subscribe: (listener: FrameViewListener) => () => void;
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
  let currentView: FrameViewState = {
    zoom: 1,
    centerX: 0,
    centerY: 0,
  };
  let frameSizeKey: string | null = null;
  const listeners = new Set<FrameViewListener>();

  const setView = (next: FrameViewState) => {
    currentView = next;
    for (const listener of listeners) {
      listener(currentView);
    }
  };

  const view = () => currentView;

  const subscribe = (listener: FrameViewListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

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
    computeFrameViewLayout(viewportWidth, viewportHeight, frame.width, frame.height, currentView);

  const zoomAtFramePoint = (
    factor: number,
    framePoint: FrameViewPoint,
    viewportWidth: number,
    viewportHeight: number,
    frame: FrameViewSize,
  ) => {
    setView(
      zoomFrameViewAtPoint(
        currentView,
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
    subscribe,
    syncFrame,
    view,
    zoomAtCenter,
    zoomAtFramePoint,
  };
}
