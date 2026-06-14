import type { FrameResult } from "@lisca/utils";
import { Skia, type SkImage } from "@shopify/react-native-skia";
import { useRef } from "react";

import { prepareFrameRgba } from "./frame-pixels";

function frameSkImageCacheKey(frame: FrameResult): string {
  const contrast = frame.appliedContrast ?? frame.suggestedContrast ?? frame.contrastDomain;
  const contrastKey = contrast ? `${contrast.min}:${contrast.max}` : "none";
  return `${frame.width}x${frame.height}:${frame.pixelType ?? "uint8"}:${contrastKey}:${frame.pixels.length}`;
}

function createFrameSkImage(frame: FrameResult): SkImage {
  const rgba = prepareFrameRgba(frame);
  const data = Skia.Data.fromBytes(rgba);
  const image = Skia.Image.MakeImage(
    {
      width: frame.width,
      height: frame.height,
      alphaType: 1,
      colorType: 4,
    },
    data,
    frame.width * 4,
  );
  if (!image) {
    throw new Error("Failed to create Skia image from frame");
  }
  return image;
}

/** Reuses the decoded Skia image until frame pixels or contrast change. */
export function usePreparedFrameSkImage(frame: FrameResult | null): SkImage | null {
  const cacheRef = useRef<{ key: string; image: SkImage } | null>(null);

  if (!frame) {
    return null;
  }

  const key = frameSkImageCacheKey(frame);
  if (cacheRef.current?.key === key) {
    return cacheRef.current.image;
  }

  const image = createFrameSkImage(frame);
  cacheRef.current = { key, image };
  return image;
}
