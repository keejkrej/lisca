import type { AnnotationLabel } from "lisca/viewer/contracts";

export interface RoiAnnotationValue {
  classificationLabelId: string | null;
  mask: Uint8Array;
}

export function createEmptyMask(width: number, height: number) {
  return new Uint8Array(width * height);
}

export function cloneAnnotationValue(value: RoiAnnotationValue): RoiAnnotationValue {
  return {
    classificationLabelId: value.classificationLabelId,
    mask: value.mask.slice(),
  };
}

export function coerceMask(mask: Uint8Array, width: number, height: number) {
  const expectedLength = width * height;
  if (mask.length === expectedLength) {
    return mask.slice();
  }
  const next = createEmptyMask(width, height);
  next.set(mask.slice(0, expectedLength));
  return next;
}

export function masksEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function annotationValuesEqual(left: RoiAnnotationValue, right: RoiAnnotationValue) {
  return (
    left.classificationLabelId === right.classificationLabelId &&
    masksEqual(left.mask, right.mask)
  );
}

export function maskHasPixels(mask: Uint8Array) {
  return mask.some((value) => value !== 0);
}

export function hexToRgb(color: string) {
  const value = color.trim();
  if (!value.startsWith("#")) return null;
  const hex = value.slice(1);
  if (hex.length === 3) {
    const [r, g, b] = hex.split("");
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    };
  }
  if (hex.length === 6) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }
  return null;
}

export function colorStyle(color: string, active: boolean) {
  const rgb = hexToRgb(color);
  if (!rgb) return undefined;
  return {
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${active ? 0.95 : 0.35})`,
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${active ? 0.18 : 0.1})`,
    color: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  };
}

export function slugifyLabelId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function decodeMaskBase64Png(
  maskBase64Png: string,
  expectedWidth: number,
  expectedHeight: number,
) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const target = new Image();
    target.onload = () => resolve(target);
    target.onerror = () => reject(new Error("Failed to decode annotation mask"));
    target.src = `data:image/png;base64,${maskBase64Png}`;
  });

  if (image.naturalWidth !== expectedWidth || image.naturalHeight !== expectedHeight) {
    throw new Error(
      `Annotation mask dimensions ${image.naturalWidth}x${image.naturalHeight} do not match ROI frame ${expectedWidth}x${expectedHeight}`,
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = expectedWidth;
  canvas.height = expectedHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to prepare annotation mask canvas");

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, expectedWidth, expectedHeight);
  const mask = new Uint8Array(expectedWidth * expectedHeight);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = imageData.data[index * 4] ?? 0;
  }
  return mask;
}

export async function encodeMaskToBase64Png(mask: Uint8Array, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to prepare annotation mask canvas");
  }

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

export function labelColorMap(labels: AnnotationLabel[]) {
  return Object.fromEntries(labels.map((label) => [label.id, label.color]));
}
