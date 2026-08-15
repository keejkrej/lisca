import { deflateSync } from "node:zlib";

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Tiny 8-bit grayscale PNG (microscopy-like source / annotation masks). */
export function encodeGrayPng(width: number, height: number, pixels: Uint8Array): Buffer {
  if (pixels.length !== width * height) {
    throw new Error(`gray PNG expected ${width * height} pixels, got ${pixels.length}`);
  }
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0;
    Buffer.from(pixels.subarray(y * width, (y + 1) * width)).copy(raw, y * (width + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  return Buffer.concat([
    PNG_SIG,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Tiny 8-bit RGB PNG (placeholder result plots; not drawn in-app). */
export function encodeRgbPng(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    PNG_SIG,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const TIFF_SHORT = 3;
const TIFF_LONG = 4;
const TIFF_RATIONAL = 5;

function tiffEntry(tag: number, type: number, count: number, value: number): Buffer {
  const entry = Buffer.alloc(12);
  entry.writeUInt16LE(tag, 0);
  entry.writeUInt16LE(type, 2);
  entry.writeUInt32LE(count, 4);
  entry.writeUInt32LE(value, 8);
  return entry;
}

/**
 * Uncompressed little-endian multi-page Gray8 TIFF (TCZYX ROI / mask stacks).
 * Readable by the crate `tiff` decoder Studio/CLI use.
 */
export function encodeGrayTiffPages(width: number, height: number, pages: Uint8Array[]): Buffer {
  if (pages.length === 0) throw new Error("TIFF stack needs at least one page");
  const stripSize = width * height;
  for (const page of pages) {
    if (page.length !== stripSize) {
      throw new Error(`TIFF page expected ${stripSize} pixels, got ${page.length}`);
    }
  }

  const headerSize = 8;
  const entryCount = 12;
  const ifdSize = 2 + 12 * entryCount + 4;
  const rationalSize = 16;

  const paddedStrip = stripSize + (stripSize % 2);
  const stripOffsets: number[] = [];
  let cursor = headerSize;
  for (let i = 0; i < pages.length; i++) {
    stripOffsets.push(cursor);
    cursor += paddedStrip;
  }

  const ifdOffsets: number[] = [];
  const rationalOffsets: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    ifdOffsets.push(cursor);
    cursor += ifdSize;
    rationalOffsets.push(cursor);
    cursor += rationalSize;
  }

  const out = Buffer.alloc(cursor);
  out.writeUInt16LE(0x4949, 0);
  out.writeUInt16LE(42, 2);
  out.writeUInt32LE(ifdOffsets[0] ?? 0, 4);

  for (let i = 0; i < pages.length; i++) {
    const dest = stripOffsets[i] ?? 0;
    Buffer.from(pages[i] ?? []).copy(out, dest);
  }

  for (let i = 0; i < pages.length; i++) {
    const ifdAt = ifdOffsets[i] ?? 0;
    const rationalAt = rationalOffsets[i] ?? 0;
    const nextIfd = i + 1 < pages.length ? (ifdOffsets[i + 1] ?? 0) : 0;
    const stripAt = stripOffsets[i] ?? 0;

    out.writeUInt32LE(72, rationalAt);
    out.writeUInt32LE(1, rationalAt + 4);
    out.writeUInt32LE(72, rationalAt + 8);
    out.writeUInt32LE(1, rationalAt + 12);

    let offset = ifdAt;
    out.writeUInt16LE(entryCount, offset);
    offset += 2;
    const entries = [
      tiffEntry(254, TIFF_LONG, 1, 2),
      tiffEntry(256, TIFF_SHORT, 1, width),
      tiffEntry(257, TIFF_SHORT, 1, height),
      tiffEntry(258, TIFF_SHORT, 1, 8),
      tiffEntry(259, TIFF_SHORT, 1, 1),
      tiffEntry(262, TIFF_SHORT, 1, 1),
      tiffEntry(273, TIFF_LONG, 1, stripAt),
      tiffEntry(277, TIFF_SHORT, 1, 1),
      tiffEntry(278, TIFF_SHORT, 1, height),
      tiffEntry(279, TIFF_LONG, 1, stripSize),
      tiffEntry(282, TIFF_RATIONAL, 1, rationalAt),
      tiffEntry(283, TIFF_RATIONAL, 1, rationalAt + 8),
    ];
    // Keep tags in ascending order (TIFF readers expect this).
    entries.sort((left, right) => left.readUInt16LE(0) - right.readUInt16LE(0));
    for (const entry of entries) {
      entry.copy(out, offset);
      offset += 12;
    }
    out.writeUInt32LE(nextIfd, offset);
  }

  return out;
}

export function colorFromName(name: string): [number, number, number] {
  let hash = 2166136261;
  for (const ch of name) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return [96 + (hash & 127), 80 + ((hash >>> 8) & 127), 64 + ((hash >>> 16) & 127)];
}
