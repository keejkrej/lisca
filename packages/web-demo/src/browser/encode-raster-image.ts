function canvasToBytes(canvas: HTMLCanvasElement, mimeType: "image/png" | "image/jpeg"): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Failed to encode ${mimeType}`));
        return;
      }
      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch(reject);
    }, mimeType);
  });
}

function grayPixelsToRgba(
  width: number,
  height: number,
  pixels: Uint8Array | Uint16Array,
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const value = Math.max(0, Math.min(255, Math.round(Number(pixels[index] ?? 0))));
    const offset = index * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  return rgba;
}

export async function encodeRasterGrayImage(
  kind: "png" | "jpeg",
  width: number,
  height: number,
  pixels: Uint8Array | Uint16Array,
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to prepare image canvas");
  const rgba = grayPixelsToRgba(width, height, pixels);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  return canvasToBytes(canvas, kind === "png" ? "image/png" : "image/jpeg");
}
