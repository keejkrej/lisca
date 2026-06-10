import type { AnnotationLabel } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type { CanvasStatusMessage } from "@lisca/ui-headless";
import { Canvas, Group, Image, Rect, Skia } from "@shopify/react-native-skia";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useShellTheme } from "../../theme/shell-theme.tsx";
import { computeFrameLayout, prepareFrameRgba } from "../canvas/frame-pixels.ts";
export type AnnotationTool = "brush" | "brush-erase" | "lasso" | "lasso-erase";
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
  const { colors } = useShellTheme();
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
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
        },
      ]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout({
          width: Math.max(1, width),
          height: Math.max(1, height),
        });
      }}
    >
      <Canvas style={styles.canvas}>
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
      {toasts?.map((toast) => (
        <View key={toast.text} style={styles.toast}>
          <Text style={styles.toastText}>{toast.text}</Text>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  canvas: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  toast: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(24,24,27,0.88)",
    borderRadius: 10,
    padding: 10,
  },
  toastText: {
    color: "#fff",
  },
});
