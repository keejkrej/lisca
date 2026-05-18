import type { AnnotationLabel, FramePayload, FrameResult } from "@lisca/contracts";

export type AnnotationValue = {
  classificationLabelId: string | null;
  mask: Uint8Array;
};

export function createEmptyMask(width: number, height: number) {
  return new Uint8Array(width * height);
}

export function cloneAnnotationValue(value: AnnotationValue): AnnotationValue {
  return {
    classificationLabelId: value.classificationLabelId,
    mask: value.mask.slice(),
  };
}

export function masksEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

export function annotationValuesEqual(left: AnnotationValue, right: AnnotationValue) {
  return (
    left.classificationLabelId === right.classificationLabelId && masksEqual(left.mask, right.mask)
  );
}

export function framePayloadToResult(payload: FramePayload): FrameResult {
  const binary = window.atob(payload.dataBase64);
  const pixels = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    pixels[i] = binary.charCodeAt(i);
  }
  return {
    width: payload.width,
    height: payload.height,
    pixels,
    pixelType: payload.pixelType,
    contrastDomain: payload.contrastDomain,
    suggestedContrast: payload.suggestedContrast,
    appliedContrast: payload.appliedContrast,
  };
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
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const target = new Image();
    target.onload = () => resolve(target);
    target.onerror = () => reject(new Error("Failed to decode annotation mask"));
    target.src = `data:image/png;base64,${maskBase64Png}`;
  });
  if (image.naturalWidth !== expectedWidth || image.naturalHeight !== expectedHeight) {
    throw new Error("Annotation mask dimensions do not match ROI frame");
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

export function maskHasPixels(mask: Uint8Array) {
  return mask.some((value) => value !== 0);
}

export function fillPolygon(
  mask: Uint8Array,
  width: number,
  height: number,
  points: { x: number; y: number }[],
  value: number,
) {
  if (points.length < 3) return mask.slice();
  const next = mask.slice();
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...ys)));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) {
        next[y * width + x] = value;
      }
    }
  }
  return next;
}

export function strokeMask(
  mask: Uint8Array,
  width: number,
  height: number,
  points: { x: number; y: number }[],
  value: number,
  radius = 4,
) {
  if (points.length === 0) return mask.slice();
  const next = mask.slice();
  const r = Math.max(1, Math.round(radius));

  const paintDisk = (cx: number, cy: number) => {
    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(width - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(height - 1, Math.ceil(cy + r));
    const radiusSq = r * r;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radiusSq) next[y * width + x] = value;
      }
    }
  };

  paintDisk(points[0]!.x, points[0]!.y);
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const distance = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
    const steps = Math.ceil(distance / Math.max(1, r / 2));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      paintDisk(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    }
  }
  return next;
}

function pointInPolygon(x: number, y: number, points: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i]!;
    const b = points[j]!;
    const intersects = a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
