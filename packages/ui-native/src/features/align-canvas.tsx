import type {
  AlignGridCellCoord,
  AlignGridState,
  CanvasStatusMessage,
  FrameResult,
} from "@lisca/contracts";
import {
  alignGridBasis,
  enumerateVisibleAlignGridCells,
  type AlignGridWheelViewport,
} from "@lisca/utils";
import { Canvas, Group, Image, Rect, Skia, useCanvasRef } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useShellTheme } from "../theme/shell-theme.tsx";
import { clientToFramePoint, computeFrameLayout, prepareFrameRgba } from "./canvas/frame-pixels.ts";
export type AlignCanvasFramePoint = {
  x: number;
  y: number;
};
export type AlignCanvasPointerEvent = {
  pointerId: number;
  pointerType: string;
  button: number;
  buttons: number;
  clientX: number;
  clientY: number;
  framePoint: AlignCanvasFramePoint | null;
  viewport: AlignGridWheelViewport | null;
  preventDefault: () => void;
  capturePointer: () => void;
  releasePointer: () => void;
};
export type AlignCanvasProps = {
  frame: FrameResult | null;
  grid: AlignGridState;
  previewGrid?: AlignGridState | null;
  excludedCells?: Iterable<AlignGridCellCoord>;
  loading?: boolean;
  emptyText?: string;
  messages?: CanvasStatusMessage[];
  toasts?: CanvasStatusMessage[];
  cursor?: string;
  onVirtualPointerDown?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerMove?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerUp?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerCancel?: (event: AlignCanvasPointerEvent) => void;
};
export function AlignCanvas({
  frame,
  grid,
  previewGrid,
  excludedCells,
  loading,
  emptyText,
  toasts,
  onVirtualPointerDown,
  onVirtualPointerMove,
  onVirtualPointerUp,
  onVirtualPointerCancel,
}: AlignCanvasProps) {
  const { colors } = useShellTheme();
  const canvasRef = useCanvasRef();
  const [layout, setLayout] = useState({
    width: 1,
    height: 1,
  });
  const boundsRef = useRef({
    x: 0,
    y: 0,
  });
  const capturedRef = useRef<number | null>(null);
  const activeGrid = previewGrid ?? grid;
  const excludedKeys = new Set(Array.from(excludedCells ?? [], (cell) => `${cell.i}:${cell.j}`));
  const skImage = (() => {
    if (!frame) return null;
    const rgba = prepareFrameRgba(frame);
    const data = Skia.Data.fromBytes(rgba);
    return Skia.Image.MakeImage(
      {
        width: frame.width,
        height: frame.height,
        alphaType: 1,
        colorType: 4,
      },
      data,
      frame.width * 4,
    );
  })();
  const frameLayout = (() => {
    if (!frame) return null;
    return computeFrameLayout(layout.width, layout.height, frame.width, frame.height);
  })();
  const viewport = ((): AlignGridWheelViewport | null => {
    if (!frame) return null;
    return {
      displayWidth: layout.width,
      displayHeight: layout.height,
      modelWidth: frame.width,
      modelHeight: frame.height,
    };
  })();
  const makeEvent = (
    pointerId: number,
    pointerType: string,
    x: number,
    y: number,
    button = 0,
  ): AlignCanvasPointerEvent => {
    const framePoint =
      frameLayout != null
        ? clientToFramePoint(x, y, frameLayout, boundsRef.current.x, boundsRef.current.y)
        : null;
    return {
      pointerId,
      pointerType,
      button,
      buttons: button,
      clientX: x,
      clientY: y,
      framePoint,
      viewport,
      preventDefault: () => undefined,
      capturePointer: () => {
        capturedRef.current = pointerId;
      },
      releasePointer: () => {
        if (capturedRef.current === pointerId) capturedRef.current = null;
      },
    };
  };
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((event) =>
      onVirtualPointerDown?.(makeEvent(1, "touch", event.absoluteX, event.absoluteY)),
    )
    .onUpdate((event) =>
      onVirtualPointerMove?.(makeEvent(1, "touch", event.absoluteX, event.absoluteY)),
    )
    .onEnd((event) => onVirtualPointerUp?.(makeEvent(1, "touch", event.absoluteX, event.absoluteY)))
    .onFinalize((event) =>
      onVirtualPointerCancel?.(makeEvent(1, "touch", event.absoluteX, event.absoluteY)),
    );
  const gridCells = (() => {
    if (!frame || !activeGrid.enabled) return [];
    return enumerateVisibleAlignGridCells(frame, activeGrid).map((cell) => ({
      ...cell,
      excluded: excludedKeys.has(`${cell.i}:${cell.j}`),
    }));
  })();
  const gridOverlay = (() => {
    if (!frame || !frameLayout || !activeGrid.enabled) return null;
    const basis = alignGridBasis(
      activeGrid.shape,
      activeGrid.rotation,
      activeGrid.spacingA,
      activeGrid.spacingB,
    );
    const originX = frameLayout.drawX + (frame.width / 2 + activeGrid.tx) * frameLayout.scale;
    const originY = frameLayout.drawY + (frame.height / 2 + activeGrid.ty) * frameLayout.scale;
    return {
      basis,
      originX,
      originY,
      scale: frameLayout.scale,
      drawX: frameLayout.drawX,
      drawY: frameLayout.drawY,
    };
  })();
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
        },
      ]}
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
      <GestureDetector gesture={pan}>
        <View style={styles.canvasWrap}>
          <Canvas ref={canvasRef} style={styles.canvas}>
            <Rect
              x={0}
              y={0}
              width={layout.width}
              height={layout.height}
              color={colors.background}
            />
            {skImage && frameLayout ? (
              <Group>
                <Image
                  image={skImage}
                  x={frameLayout.drawX}
                  y={frameLayout.drawY}
                  width={frameLayout.drawWidth}
                  height={frameLayout.drawHeight}
                  fit="fill"
                />
                {gridCells.map((cell) => (
                  <Rect
                    key={`${cell.i}:${cell.j}`}
                    x={frameLayout.drawX + cell.x * frameLayout.scale}
                    y={frameLayout.drawY + cell.y * frameLayout.scale}
                    width={cell.w * frameLayout.scale}
                    height={cell.h * frameLayout.scale}
                    color={cell.excluded ? "rgba(244, 63, 94, 0.45)" : "rgba(68, 151, 255, 0.45)"}
                    style="fill"
                  />
                ))}
                {gridOverlay ? (
                  <Group>
                    <Rect
                      x={gridOverlay.originX - 4}
                      y={gridOverlay.originY - 4}
                      width={8}
                      height={8}
                      color="white"
                    />
                  </Group>
                ) : null}
              </Group>
            ) : null}
          </Canvas>
        </View>
      </GestureDetector>

      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}

      {!frame && !loading && emptyText ? (
        <View style={styles.overlay}>
          <Text
            style={{
              color: colors.mutedForeground,
            }}
          >
            {emptyText}
          </Text>
        </View>
      ) : null}

      {toasts && toasts.length > 0 ? (
        <View style={styles.toastStack}>
          {toasts.map((toast, index) => (
            <View
              key={`${toast.text}-${index}`}
              style={[
                styles.toast,
                {
                  backgroundColor:
                    toast.tone === "error" ? "rgba(220,38,38,0.92)" : "rgba(24,24,27,0.88)",
                },
              ]}
            >
              <Text style={styles.toastText}>{toast.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  canvasWrap: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  toastStack: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    gap: 8,
  },
  toast: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toastText: {
    color: "#fff",
    fontSize: 13,
  },
});
