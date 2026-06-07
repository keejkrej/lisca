import type { AnnotationLabel } from "@lisca/contracts";
import { hexToRgb, masksEqual } from "@lisca/utils";

export {
  createEmptyMask,
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

export async function encodeMaskToBase64Png(mask: Uint8Array, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to prepare annotation mask canvas");
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index] ?? 0;
    const offset = index * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toDataURL("image/png").split(",")[1] ?? "";
}
