import type { FrameLayout } from "@lisca/utils";
import { alignGridOverlayColors, buildAlignFrameHaloRect } from "@lisca/utils";
import { Rect } from "@shopify/react-native-skia";

export function AlignFrameChrome(props: { frameLayout: FrameLayout }) {
  const haloRect = buildAlignFrameHaloRect(props.frameLayout);
  return (
    <>
      <Rect
        color={alignGridOverlayColors.frameHaloFill}
        height={haloRect.h}
        width={haloRect.w}
        x={haloRect.x}
        y={haloRect.y}
      />
      <Rect
        color={alignGridOverlayColors.frameHaloStroke}
        height={haloRect.h - 1}
        strokeWidth={1}
        style="stroke"
        width={haloRect.w - 1}
        x={haloRect.x + 0.5}
        y={haloRect.y + 0.5}
      />
    </>
  );
}
