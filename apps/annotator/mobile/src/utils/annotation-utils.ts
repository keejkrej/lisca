import { Skia } from "@shopify/react-native-skia";

import type { AnnotationLabel } from "@lisca/contracts";
import { hexToRgb, masksEqual } from "@lisca/utils";

export {
  createEmptyMask,
  decodeFramePayload as framePayloadToResult,
  fillPolygon,
  hexToRgb,
  maskHasPixels,
  masksEqual,
  strokeMask,
} from "@lisca/utils";

export type AnnotationValue = {
  classificationLabelId: string | null;
  mask: Uint8Array;
};

export function cloneAnnotationValue(value: AnnotationValue): AnnotationValue {
  return {
    classificationLabelId: value.classificationLabelId,
    mask: value.mask.slice(),
  };
}

export function annotationValuesEqual(left: AnnotationValue, right: AnnotationValue) {
  return (
    left.classificationLabelId === right.classificationLabelId && masksEqual(left.mask, right.mask)
  );
}

export function labelColorStyle(label: AnnotationLabel, selected: boolean) {
  const rgb = hexToRgb(label.color);
  if (!rgb) return undefined;
  return {
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${selected ? 0.95 : 0.35})`,
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${selected ? 0.18 : 0.1})`,
    color: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  };
}

export async function decodeMaskBase64Png(
  maskBase64Png: string,
  expectedWidth: number,
  expectedHeight: number,
) {
  const data = Skia.Data.fromBase64(maskBase64Png);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error("Failed to decode annotation mask");
  if (image.width() !== expectedWidth || image.height() !== expectedHeight) {
    throw new Error("Annotation mask dimensions do not match ROI frame");
  }
  const pixels = image.readPixels();
  if (!pixels) throw new Error("Failed to read annotation mask pixels");
  const mask = new Uint8Array(expectedWidth * expectedHeight);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = pixels[index * 4] ?? 0;
  }
  return mask;
}

export async function encodeMaskToBase64Png(mask: Uint8Array, width: number, height: number) {
  const rgba = new Uint8Array(width * height * 4);
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index] ?? 0;
    const offset = index * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  const data = Skia.Data.fromBytes(rgba);
  const image = Skia.Image.MakeImage(
    { width, height, alphaType: 1, colorType: 4 },
    data,
    width * 4,
  );
  if (!image) throw new Error("Failed to encode annotation mask");
  const encoded = image.encodeToBase64();
  if (!encoded) throw new Error("Failed to encode annotation mask");
  return encoded;
}
