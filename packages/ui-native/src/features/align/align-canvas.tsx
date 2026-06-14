import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type { CanvasStatusMessage } from "@lisca/ui-headless";
import { computeFrameLayout, type FrameLayout } from "@lisca/utils";
import { Canvas, Group, Image, Rect, type SkImage } from "@shopify/react-native-skia";
import { useEffect, useRef, useState, type RefObject } from "react";
import { View } from "react-native";

import { canvasPanResponderProps } from "../canvas/canvas-pan-responder";
import { CanvasToastStack } from "../canvas/canvas-status";
import { useCanvasBackground } from "../canvas/canvas-theme";
import { clientToFramePoint } from "../canvas/frame-pixels";
import { usePreparedFrameSkImage } from "../canvas/prepared-frame-sk-image";
import { AlignFrameChrome } from "./align-frame-chrome";
import { AlignGridSkiaOverlay } from "./align-grid-skia-overlay";

export type { AlignCanvasFramePoint, AlignCanvasPointerEvent } from "./align-canvas-handlers";
import type { AlignCanvasPointerEvent } from "./align-canvas-handlers";

export type AlignCanvasProps = {
  frame: FrameResult | null;
  grid: AlignGridState;
  previewGridRef?: RefObject<AlignGridState | null>;
  previewRedrawRef?: RefObject<(() => void) | null>;
  excludedCells?: Iterable<AlignGridCellCoord>;
  emptyText?: string;
  messages?: CanvasStatusMessage[];
  toasts?: CanvasStatusMessage[];
  cursor?: string;
  onVirtualPointerDown?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerMove?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerUp?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerCancel?: (event: AlignCanvasPointerEvent) => void;
};

function AlignCanvasFrameImage(props: {
  frameLayout: FrameLayout;
  skImage: SkImage;
}) {
  return (
    <Image
      fit="fill"
      height={props.frameLayout.drawHeight}
      image={props.skImage}
      width={props.frameLayout.drawWidth}
      x={props.frameLayout.drawX}
      y={props.frameLayout.drawY}
    />
  );
}

function AlignCanvasGridLayer(props: {
  frame: FrameResult;
  viewportWidth: number;
  viewportHeight: number;
  grid: AlignGridState;
  excludedCells?: Iterable<AlignGridCellCoord>;
}) {
  return (
    <AlignGridSkiaOverlay
      excludedCells={props.excludedCells}
      frame={props.frame}
      grid={props.grid}
      viewportHeight={props.viewportHeight}
      viewportWidth={props.viewportWidth}
    />
  );
}

export function AlignCanvas({
  frame,
  grid,
  previewGridRef,
  previewRedrawRef,
  excludedCells,
  toasts,
  onVirtualPointerDown,
  onVirtualPointerMove,
  onVirtualPointerUp,
  onVirtualPointerCancel,
}: AlignCanvasProps) {
  const canvasBackground = useCanvasBackground();
  const skImage = usePreparedFrameSkImage(frame);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const [layout, setLayout] = useState({
    width: 1,
    height: 1,
  });
  const [overlayTick, setOverlayTick] = useState(0);
  const boundsRef = useRef({
    x: 0,
    y: 0,
  });
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const capturedRef = useRef<number | null>(null);
  const pointerHandlersRef = useRef({
    onVirtualPointerDown,
    onVirtualPointerMove,
    onVirtualPointerUp,
    onVirtualPointerCancel,
  });
  pointerHandlersRef.current = {
    onVirtualPointerDown,
    onVirtualPointerMove,
    onVirtualPointerUp,
    onVirtualPointerCancel,
  };
  const frameLayout = frame ? computeFrameLayout(layout.width, layout.height, frame.width, frame.height) : null;
  const requestOverlayRedraw = () => {
    setOverlayTick((tick) => tick + 1);
  };
  useEffect(() => {
    requestOverlayRedraw();
  }, [grid]);
  useEffect(() => {
    if (!previewRedrawRef) return;
    previewRedrawRef.current = requestOverlayRedraw;
    return () => {
      previewRedrawRef.current = null;
    };
  }, [previewRedrawRef]);
  void overlayTick;
  const activeGrid = previewGridRef?.current ?? gridRef.current;
  const emitPointerEvent = (
    phase: "down" | "move" | "up" | "cancel",
    clientX: number,
    clientY: number,
  ) => {
    const currentFrame = frameRef.current;
    const currentLayout = layoutRef.current;
    const currentFrameLayout =
      currentFrame != null
        ? computeFrameLayout(
            currentLayout.width,
            currentLayout.height,
            currentFrame.width,
            currentFrame.height,
          )
        : null;
    const currentViewport =
      currentFrame != null
        ? {
            displayWidth: currentLayout.width,
            displayHeight: currentLayout.height,
            modelWidth: currentFrame.width,
            modelHeight: currentFrame.height,
          }
        : null;
    const event: AlignCanvasPointerEvent = {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      buttons: 0,
      clientX,
      clientY,
      framePoint:
        currentFrameLayout != null
          ? clientToFramePoint(
              clientX,
              clientY,
              currentFrameLayout,
              boundsRef.current.x,
              boundsRef.current.y,
            )
          : null,
      viewport: currentViewport,
      preventDefault: () => undefined,
      capturePointer: () => {
        capturedRef.current = 1;
      },
      releasePointer: () => {
        if (capturedRef.current === 1) capturedRef.current = null;
      },
    };
    const handlers = pointerHandlersRef.current;
    if (phase === "down") handlers.onVirtualPointerDown?.(event);
    if (phase === "move") handlers.onVirtualPointerMove?.(event);
    if (phase === "up") handlers.onVirtualPointerUp?.(event);
    if (phase === "cancel") handlers.onVirtualPointerCancel?.(event);
  };
  const panResponderRef = useRef(
    canvasPanResponderProps({
      onBegin: (clientX, clientY) => emitPointerEvent("down", clientX, clientY),
      onMove: (clientX, clientY) => emitPointerEvent("move", clientX, clientY),
      onEnd: (clientX, clientY) => emitPointerEvent("up", clientX, clientY),
      onCancel: (clientX, clientY) => emitPointerEvent("cancel", clientX, clientY),
    }),
  );

  return (
    <View
      className="relative min-h-0 flex-1 bg-background"
      onLayout={(event) => {
        const { width, height, x, y } = event.nativeEvent.layout;
        setLayout({
          width: Math.max(1, width),
          height: Math.max(1, height),
        });
        boundsRef.current = {
          x,
          y,
        };
      }}
    >
      <View className="flex-1" {...panResponderRef.current}>
        <Canvas style={{ flex: 1 }}>
          <Rect color={canvasBackground} height={layout.height} width={layout.width} x={0} y={0} />
          {skImage && frame && frameLayout ? (
            <Group>
              <AlignFrameChrome frameLayout={frameLayout} />
              <AlignCanvasFrameImage frameLayout={frameLayout} skImage={skImage} />
              <AlignCanvasGridLayer
                excludedCells={excludedCells}
                frame={frame}
                grid={activeGrid}
                viewportHeight={layout.height}
                viewportWidth={layout.width}
              />
            </Group>
          ) : null}
        </Canvas>
      </View>

      <CanvasToastStack messages={toasts} />
    </View>
  );
}
