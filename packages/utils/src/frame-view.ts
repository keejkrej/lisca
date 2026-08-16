import { clamp } from "./frame";
import { computeFrameLayout, type FrameLayout } from "./frame-display";

export const FRAME_VIEW_MIN_ZOOM = 1;
export const FRAME_VIEW_MAX_ZOOM = 16;

/** Ephemeral canvas-only view state. Frame pixels and saved assay data never depend on it. */
export type FrameViewState = {
  zoom: number;
  centerX: number;
  centerY: number;
};

export type FrameViewPoint = {
  x: number;
  y: number;
};

export function createFitFrameView(frameWidth: number, frameHeight: number): FrameViewState {
  return {
    zoom: FRAME_VIEW_MIN_ZOOM,
    centerX: frameWidth / 2,
    centerY: frameHeight / 2,
  };
}

function clampFrameViewCenter(
  center: number,
  viewportSize: number,
  frameSize: number,
  scale: number,
): number {
  const visibleHalfSize = viewportSize / Math.max(scale * 2, Number.EPSILON);
  if (visibleHalfSize * 2 >= frameSize) return frameSize / 2;
  return clamp(center, visibleHalfSize, frameSize - visibleHalfSize);
}

export function normalizeFrameView(
  view: FrameViewState,
  viewportWidth: number,
  viewportHeight: number,
  frameWidth: number,
  frameHeight: number,
): FrameViewState {
  const zoom = clamp(view.zoom, FRAME_VIEW_MIN_ZOOM, FRAME_VIEW_MAX_ZOOM);
  if (zoom === FRAME_VIEW_MIN_ZOOM) return createFitFrameView(frameWidth, frameHeight);
  const fit = computeFrameLayout(viewportWidth, viewportHeight, frameWidth, frameHeight);
  const scale = fit.scale * zoom;
  return {
    zoom,
    centerX: clampFrameViewCenter(view.centerX, viewportWidth, frameWidth, scale),
    centerY: clampFrameViewCenter(view.centerY, viewportHeight, frameHeight, scale),
  };
}

/** Computes the sole layout used by canvas pixels, overlays, and hit-testing. */
export function computeFrameViewLayout(
  viewportWidth: number,
  viewportHeight: number,
  frameWidth: number,
  frameHeight: number,
  view: FrameViewState,
): FrameLayout {
  const fit = computeFrameLayout(viewportWidth, viewportHeight, frameWidth, frameHeight);
  const normalized = normalizeFrameView(
    view,
    viewportWidth,
    viewportHeight,
    frameWidth,
    frameHeight,
  );
  const scale = fit.scale * normalized.zoom;
  return {
    scale,
    drawWidth: frameWidth * scale,
    drawHeight: frameHeight * scale,
    drawX: viewportWidth / 2 - normalized.centerX * scale,
    drawY: viewportHeight / 2 - normalized.centerY * scale,
  };
}

/**
 * Zooms without moving the addressed frame pixel on screen, subject only to edge clamping.
 */
export function zoomFrameViewAtPoint(
  view: FrameViewState,
  factor: number,
  framePoint: FrameViewPoint,
  viewportWidth: number,
  viewportHeight: number,
  frameWidth: number,
  frameHeight: number,
): FrameViewState {
  const current = normalizeFrameView(view, viewportWidth, viewportHeight, frameWidth, frameHeight);
  const nextZoom = clamp(
    current.zoom * (Number.isFinite(factor) && factor > 0 ? factor : 1),
    FRAME_VIEW_MIN_ZOOM,
    FRAME_VIEW_MAX_ZOOM,
  );
  if (nextZoom === FRAME_VIEW_MIN_ZOOM) return createFitFrameView(frameWidth, frameHeight);
  if (nextZoom === current.zoom) return current;

  const currentLayout = computeFrameViewLayout(
    viewportWidth,
    viewportHeight,
    frameWidth,
    frameHeight,
    current,
  );
  const pointerX = currentLayout.drawX + framePoint.x * currentLayout.scale;
  const pointerY = currentLayout.drawY + framePoint.y * currentLayout.scale;
  const fitScale = computeFrameLayout(viewportWidth, viewportHeight, frameWidth, frameHeight).scale;
  const nextScale = fitScale * nextZoom;

  return normalizeFrameView(
    {
      zoom: nextZoom,
      centerX: framePoint.x - (pointerX - viewportWidth / 2) / nextScale,
      centerY: framePoint.y - (pointerY - viewportHeight / 2) / nextScale,
    },
    viewportWidth,
    viewportHeight,
    frameWidth,
    frameHeight,
  );
}

export function frameViewWheelFactor(
  deltaY: number,
  deltaMode: number,
  viewportHeight: number,
): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * viewportHeight : deltaY;
  return 2 ** (-pixels / 240);
}
