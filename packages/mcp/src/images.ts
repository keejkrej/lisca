import { deflateSync } from "node:zlib";

export interface ContrastWindow {
  min: number;
  max: number;
}

/** Frame pixel formats exchanged over the JSON API (`FramePayload.pixelType`). */
export type PixelType =
  | "uint8"
  | "uint8clamped"
  | "uint16"
  | "int8"
  | "int16"
  | "uint32"
  | "int32"
  | "float32"
  | "float64";

/** Minimal shape of the wire `FramePayload` this server renders. */
export interface FramePixels {
  width: number;
  height: number;
  dataBase64: string;
  pixelType: string;
  contrastDomain?: ContrastWindow | null;
  suggestedContrast?: ContrastWindow | null;
  appliedContrast?: ContrastWindow | null;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const chunk = Buffer.alloc(8 + data.length + 4);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, "ascii");
  Buffer.from(data).copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
}

/** Encode 8-bit grayscale pixels as a minimal PNG. */
export function encodeGrayPng(width: number, height: number, gray: Uint8Array): Buffer {
  const scanlines = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y++) {
    scanlines[y * (width + 1)] = 0; // filter type: none
    Buffer.from(gray.buffer, gray.byteOffset + y * width, width).copy(
      scanlines,
      y * (width + 1) + 1,
    );
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // color type: grayscale
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines)),
    pngChunk("IEND", new Uint8Array(0)),
  ]);
}

function readPixel(bytes: Buffer, index: number, pixelType: PixelType): number {
  switch (pixelType) {
    case "uint8":
    case "uint8clamped":
      return bytes[index];
    case "uint16":
      return bytes.readUInt16LE(index * 2);
    case "int8":
      return bytes.readInt8(index);
    case "int16":
      return bytes.readInt16LE(index * 2);
    case "uint32":
      return bytes.readUInt32LE(index * 4);
    case "int32":
      return bytes.readInt32LE(index * 4);
    case "float32":
      return bytes.readFloatLE(index * 4);
    case "float64":
      return bytes.readDoubleLE(index * 8);
    default:
      return bytes[index];
  }
}

function pixelByteLength(pixelType: PixelType): number {
  switch (pixelType) {
    case "uint8":
    case "uint8clamped":
    case "int8":
      return 1;
    case "uint16":
    case "int16":
      return 2;
    case "uint32":
    case "int32":
    case "float32":
      return 4;
    case "float64":
      return 8;
    default:
      return 1;
  }
}

export interface RenderedFrame {
  png: Buffer;
  /** Contrast window applied for the rendered PNG. */
  applied: ContrastWindow;
  /** Min/max of the raw pixel values, for follow-up contrast choices. */
  pixelMin: number;
  pixelMax: number;
}

/**
 * Decode a wire `FramePayload` and render it as an 8-bit grayscale PNG using the
 * display contrast mapping: requested window, else the suggested window, else
 * the pixel value range. Matches how the app canvases display frames.
 */
export function renderFrame(frame: FramePixels, contrast?: ContrastWindow | null): RenderedFrame {
  const width = frame.width;
  const height = frame.height;
  const pixelType = frame.pixelType as PixelType;
  const bytesPerPixel = pixelByteLength(pixelType);
  const bytes = Buffer.from(frame.dataBase64, "base64");
  const count = width * height;
  const expected = count * bytesPerPixel;
  if (bytes.length < expected) {
    throw new Error(
      `frame payload has ${bytes.length} bytes but ${expected} are needed for ` +
        `${width}x${height} ${pixelType}`,
    );
  }
  const values = new Float64Array(count);
  let pixelMin = Number.POSITIVE_INFINITY;
  let pixelMax = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < count; i++) {
    const value = readPixel(bytes, i, pixelType);
    values[i] = value;
    if (value < pixelMin) pixelMin = value;
    if (value > pixelMax) pixelMax = value;
  }
  let applied: ContrastWindow = contrast ??
    frame.suggestedContrast ??
    frame.contrastDomain ?? {
      min: Number.isFinite(pixelMin) ? pixelMin : 0,
      max: Number.isFinite(pixelMax) ? pixelMax : 255,
    };
  applied = { min: applied.min, max: Math.max(applied.max, applied.min) };
  const span = applied.max - applied.min;
  const gray = new Uint8Array(count);
  if (span === 0) {
    // Constant window (a requested {min: 7, max: 7}): render mid-gray instead
    // of black, so a flat frame does not look like a rendering failure.
    gray.fill(128);
  } else {
    for (let i = 0; i < count; i++) {
      gray[i] = Math.max(0, Math.min(255, Math.round(((values[i] - applied.min) / span) * 255)));
    }
  }
  return { png: encodeGrayPng(width, height, gray), applied, pixelMin, pixelMax };
}

/** True when a buffer starts with a PNG signature. */
export function isPng(bytes: Buffer): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}
