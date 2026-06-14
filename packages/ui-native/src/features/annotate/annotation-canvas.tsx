import type { AnnotationLabel } from "@lisca/contracts";
import { clamp, hexToRgb, type FrameResult } from "@lisca/utils";
import type { CanvasStatusMessage } from "@lisca/ui-headless";
import {
  useAnnotationCanvasHandlers,
  type AnnotationCanvasPointerEvent,
} from "@lisca/ui-headless/annotation-canvas-handlers";
import { Canvas, Circle, Group, Image, Path, Rect, Skia } from "@shopify/react-native-skia";
import { useRef, useState } from "react";
import { View } from "react-native";

import { Text } from "../../../components/ui/text";
import { canvasPanResponderProps } from "../canvas/canvas-pan-responder";
import { CanvasToastStack } from "../canvas/canvas-status";
import { useCanvasBackground } from "../canvas/canvas-theme";
import { computeFrameLayout, prepareFrameRgba } from "../canvas/frame-pixels";
import type { AnnotationTool } from "@lisca/ui-headless/annotation-tools";

export type { AnnotationTool } from "@lisca/ui-headless/annotation-tools";
export {
  ANNOTATION_TOOL_DEFINITIONS,
  toolCanRunWithoutLabel,
} from "@lisca/ui-headless/annotation-tools";
export {
  useAnnotationCanvasHandlers,
  type AnnotationCanvasPointerEvent,
} from "@lisca/ui-headless/annotation-canvas-handlers";

export type SmartSegmentPrompt = {
  x: number;
  y: number;
  label: 0 | 1;
};

export type AnnotationCanvasProps = {
  frame: FrameResult | null;
  labels: AnnotationLabel[];
  mask: Uint8Array;
  activeLabelId: string | null;
  tool: AnnotationTool;
  brushSize: number;
  overlayOpacity: number;
  messages?: CanvasStatusMessage[];
  toasts?: CanvasStatusMessage[];
  disabled?: boolean;
  emptyText?: string;
  smartSegmentPrompts?: SmartSegmentPrompt[];
  onMaskCommit: (mask: Uint8Array) => void;
  onSmartSegmentClick?: (click: { x: number; y: number; negative: boolean }) => void;
  onSmartEraseClick?: (click: { x: number; y: number }) => void;
};

function prepareMaskRgba(
  frame: FrameResult,
  labels: AnnotationLabel[],
  mask: Uint8Array,
  overlayOpacity: number,
) {
  const rgba = new Uint8Array(frame.width * frame.height * 4);
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index] ?? 0;
    if (value <= 0) continue;
    const rgb = hexToRgb(labels[value - 1]?.color ?? "") ?? {
      r: 59,
      g: 130,
      b: 246,
    };
    const offset = index * 4;
    rgba[offset] = rgb.r;
    rgba[offset + 1] = rgb.g;
    rgba[offset + 2] = rgb.b;
    rgba[offset + 3] = Math.round(255 * clamp(overlayOpacity, 0, 1));
  }
  return rgba;
}

export function AnnotationCanvas({
  frame,
  labels,
  mask,
  activeLabelId,
  tool,
  brushSize,
  overlayOpacity,
  messages: _messages,
  toasts,
  disabled = false,
  emptyText,
  smartSegmentPrompts = [],
  loading,
  onMaskCommit,
  onSmartSegmentClick,
  onSmartEraseClick,
}: AnnotationCanvasProps & {
  loading?: boolean;
}) {
  const canvasBackground = useCanvasBackground();
  const [layout, setLayout] = useState({
    width: 1,
    height: 1,
  });
  const [bounds, setBounds] = useState({
    x: 0,
    y: 0,
  });
  const capturedRef = useRef<number | null>(null);

  const handlers = useAnnotationCanvasHandlers({
    frame,
    viewportWidth: layout.width,
    viewportHeight: layout.height,
    viewportX: bounds.x,
    viewportY: bounds.y,
    mask,
    labels,
    activeLabelId,
    tool,
    brushSize,
    disabled,
    onMaskCommit,
    onSmartSegmentClick,
    onSmartEraseClick,
  });

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

  const overlayImage = (() => {
    if (!frame || mask.length === 0) return null;
    const rgba = prepareMaskRgba(frame, labels, mask, overlayOpacity);
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

  const frameLayout = frame
    ? computeFrameLayout(layout.width, layout.height, frame.width, frame.height)
    : null;

  const makeEvent = (
    pointerId: number,
    pointerType: string,
    x: number,
    y: number,
    button = 0,
  ): AnnotationCanvasPointerEvent => ({
    pointerId,
    pointerType,
    button,
    clientX: x,
    clientY: y,
    preventDefault: () => undefined,
    capturePointer: () => {
      capturedRef.current = pointerId;
    },
    releasePointer: () => {
      if (capturedRef.current === pointerId) capturedRef.current = null;
    },
  });

  const panResponder = canvasPanResponderProps({
    onBegin: (clientX, clientY) =>
      handlers.handlePointerDown(makeEvent(1, "touch", clientX, clientY)),
    onMove: (clientX, clientY) =>
      handlers.handlePointerMove(makeEvent(1, "touch", clientX, clientY)),
    onEnd: (clientX, clientY) => handlers.handlePointerEnd(makeEvent(1, "touch", clientX, clientY)),
    onCancel: (clientX, clientY) =>
      handlers.handlePointerCancel(makeEvent(1, "touch", clientX, clientY)),
  });

  const lassoPath = (() => {
    if (!frameLayout || handlers.lassoPoints.length < 2) return null;
    const path = Skia.Path.Make();
    const first = handlers.lassoPoints[0]!;
    path.moveTo(
      frameLayout.drawX + first.x * frameLayout.scale,
      frameLayout.drawY + first.y * frameLayout.scale,
    );
    for (const point of handlers.lassoPoints.slice(1)) {
      path.lineTo(
        frameLayout.drawX + point.x * frameLayout.scale,
        frameLayout.drawY + point.y * frameLayout.scale,
      );
    }
    return path;
  })();

  const lassoStrokeWidth = handlers.brushMode ? brushSize * (frameLayout?.scale ?? 1) : 2;

  return (
    <View
      className="relative min-h-0 flex-1 bg-background"
      onLayout={(event) => {
        const { width, height, x, y } = event.nativeEvent.layout;
        setLayout({
          width: Math.max(1, width),
          height: Math.max(1, height),
        });
        setBounds({ x, y });
      }}
    >
      <View className="flex-1" {...panResponder}>
        <Canvas style={{ flex: 1 }}>
          <Rect x={0} y={0} width={layout.width} height={layout.height} color={canvasBackground} />
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
              {overlayImage ? (
                <Image
                  image={overlayImage}
                  x={frameLayout.drawX}
                  y={frameLayout.drawY}
                  width={frameLayout.drawWidth}
                  height={frameLayout.drawHeight}
                  fit="fill"
                />
              ) : null}
              {lassoPath ? (
                <Path
                  color={handlers.eraseMode ? "rgba(248,113,113,0.95)" : "rgba(250,204,21,0.95)"}
                  path={lassoPath}
                  strokeCap="round"
                  strokeJoin="round"
                  strokeWidth={lassoStrokeWidth}
                  style="stroke"
                />
              ) : null}
              {smartSegmentPrompts.map((prompt, index) => {
                if (!frameLayout) return null;
                const centerX = frameLayout.drawX + prompt.x * frameLayout.scale;
                const centerY = frameLayout.drawY + prompt.y * frameLayout.scale;
                const radius = Math.max(4, 5 * frameLayout.scale);
                return (
                  <Circle
                    key={`${prompt.x}:${prompt.y}:${index}`}
                    cx={centerX}
                    cy={centerY}
                    opacity={handlers.smartToolMode ? 1 : 0.65}
                    r={radius}
                    color={prompt.label === 1 ? "rgba(34,197,94,0.95)" : "rgba(248,113,113,0.95)"}
                  />
                );
              })}
            </Group>
          ) : null}
        </Canvas>
      </View>

      {!frame && !loading && emptyText ? (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-muted-foreground">{emptyText}</Text>
        </View>
      ) : null}

      <CanvasToastStack messages={toasts} />
    </View>
  );
}
