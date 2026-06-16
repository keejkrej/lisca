import type { FrameResult } from "@lisca/utils";
import {
  autoContrastForGrayPixels,
  createPixelArray,
  defaultContrastDomain,
  normalizeFrameContrast,
} from "@lisca/utils";

export type DemoFrameCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Crop a grayscale frame to the given source-space region. */
export function cropDemoFrame(frame: FrameResult, region: DemoFrameCrop): FrameResult {
  const pixelType = frame.pixelType ?? "uint8";
  const cropped = createPixelArray(
    pixelType,
    new ArrayBuffer(region.w * region.h * croppedBytesPerPixel(pixelType)),
  );

  for (let row = 0; row < region.h; row += 1) {
    const srcRow = (region.y + row) * frame.width + region.x;
    cropped.set(frame.pixels.subarray(srcRow, srcRow + region.w), row * region.w);
  }

  const suggested = autoContrastForGrayPixels(cropped, pixelType);
  const domain = frame.contrastDomain ?? defaultContrastDomain({ pixelType } as FrameResult);
  return normalizeFrameContrast({
    width: region.w,
    height: region.h,
    pixels: cropped,
    pixelType,
    contrastDomain: domain,
    suggestedContrast: suggested,
    appliedContrast: suggested,
  });
}

function croppedBytesPerPixel(pixelType: NonNullable<FrameResult["pixelType"]>): number {
  if (pixelType === "uint16" || pixelType === "int16") return 2;
  if (pixelType === "uint32" || pixelType === "int32") return 4;
  return 1;
}
