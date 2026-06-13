import type { AnnotationLabel } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type { CanvasStatusMessage } from "@lisca/ui-headless";
import { Canvas, Group, Image, Rect, Skia } from "@shopify/react-native-skia";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { Text } from "../../../components/ui/text";
import { useThemeColors } from "../../theme/use-theme-colors";
import { computeFrameLayout, prepareFrameRgba } from "../canvas/frame-pixels";
import type { AnnotationTool } from "@lisca/ui-headless/annotation-tools";

export type { AnnotationTool } from "@lisca/ui-headless/annotation-tools";
export { ANNOTATION_TOOL_DEFINITIONS, toolCanRunWithoutLabel } from "@lisca/ui-headless/annotation-tools";

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
  onMaskCommit: (mask: Uint8Array) => void;
};

export function AnnotationCanvas({
  frame,
  mask,
  overlayOpacity,
  loading,
  emptyText,
  toasts,
}: AnnotationCanvasProps & {
  loading?: boolean;
}) {
  const colors = useThemeColors();
  const [layout, setLayout] = useState({
    width: 1,
    height: 1,
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
    const rgba = new Uint8Array(frame.width * frame.height * 4);
    for (let index = 0; index < mask.length; index += 1) {
      const value = mask[index] ?? 0;
      if (value === 0) continue;
      const offset = index * 4;
      rgba[offset] = 244;
      rgba[offset + 1] = 63;
      rgba[offset + 2] = 94;
      rgba[offset + 3] = Math.round(255 * overlayOpacity);
    }
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

  return (
    <View
      className="min-h-0 flex-1 bg-background"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout({
          width: Math.max(1, width),
          height: Math.max(1, height),
        });
      }}
    >
      <Canvas style={{ flex: 1 }}>
        <Rect x={0} y={0} width={layout.width} height={layout.height} color={colors.background} />
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
          </Group>
        ) : null}
      </Canvas>
      {loading ? (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}
      {!frame && !loading && emptyText ? (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-muted-foreground">{emptyText}</Text>
        </View>
      ) : null}
      {toasts?.map((toast) => (
        <View
          key={toast.text}
          className="absolute bottom-3 left-3 right-3 rounded-[10px] bg-zinc-900/90 p-2.5"
        >
          <Text className="text-white">{toast.text}</Text>
        </View>
      ))}
    </View>
  );
}
