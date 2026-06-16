export type MaskLabelColor = {
  value: number;
  color: string;
};

function parseHexColor(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const r = Number.parseInt(normalized[0]! + normalized[0]!, 16);
    const g = Number.parseInt(normalized[1]! + normalized[1]!, 16);
    const b = Number.parseInt(normalized[2]! + normalized[2]!, 16);
    return [r, g, b];
  }
  if (normalized.length === 6) {
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return [r, g, b];
  }
  return [0, 0, 0];
}

function colorForMaskValue(
  value: number,
  labelColors?: ReadonlyArray<MaskLabelColor>,
): [number, number, number] {
  if (value === 0) return [0, 0, 0];
  const match = labelColors?.find((entry) => entry.value === value);
  if (match) return parseHexColor(match.color);
  return [value, value, value];
}

export async function encodeMaskToBase64Png(
  mask: Uint8Array,
  width: number,
  height: number,
  labelColors?: ReadonlyArray<MaskLabelColor>,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to prepare annotation mask canvas");
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index] ?? 0;
    const [r, g, b] = colorForMaskValue(value, labelColors);
    const offset = index * 4;
    rgba[offset] = r;
    rgba[offset + 1] = g;
    rgba[offset + 2] = b;
    rgba[offset + 3] = value === 0 ? 0 : 255;
  }
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toDataURL("image/png").split(",")[1] ?? "";
}

export async function encodeMaskToPngBytes(
  mask: Uint8Array,
  width: number,
  height: number,
  labelColors?: ReadonlyArray<MaskLabelColor>,
): Promise<Uint8Array> {
  const base64 = await encodeMaskToBase64Png(mask, width, height, labelColors);
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
