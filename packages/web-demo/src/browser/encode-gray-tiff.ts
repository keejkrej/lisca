import UTIF from "utif";
import { deflateSync } from "fflate";

import type { TiffImageFormat } from "./source-image-format";

type UtifInternals = typeof UTIF & {
  _binBE: TiffBinary;
  _writeIFD: (bin: TiffBinary, data: Uint8Array, offset: number, ifd: Record<string, number[]>) => number[];
};

const utif = UTIF as UtifInternals;

const TIFF_HEADER_SIZE = 1000;

type TiffBinary = {
  writeUshort(buff: Uint8Array, p: number, n: number): void;
  writeUint(buff: Uint8Array, p: number, n: number): void;
  writeASCII(buff: Uint8Array, p: number, s: string): void;
};

const binLE: TiffBinary = {
  writeUshort(buff, p, n) {
    buff[p] = n & 0xff;
    buff[p + 1] = n >> 8;
  },
  writeUint(buff, p, n) {
    buff[p] = n & 0xff;
    buff[p + 1] = (n >> 8) & 0xff;
    buff[p + 2] = (n >> 16) & 0xff;
    buff[p + 3] = (n >> 24) & 0xff;
  },
  writeASCII(buff, p, s) {
    for (let index = 0; index < s.length; index += 1) {
      buff[p + index] = s.charCodeAt(index);
    }
  },
};

const binBE: TiffBinary = utif._binBE;

function tiffBinary(endian: TiffImageFormat["endian"]): TiffBinary {
  return endian === "II" ? binLE : binBE;
}

function writeTiffHeader(data: Uint8Array, endian: TiffImageFormat["endian"], ifdOffset: number) {
  const bin = tiffBinary(endian);
  if (endian === "II") {
    data[0] = 73;
    data[1] = 73;
    data[2] = 42;
    data[3] = 0;
  } else {
    data[0] = 77;
    data[1] = 77;
    data[2] = 0;
    data[3] = 42;
  }
  bin.writeUint(data, 4, ifdOffset);
}

function writeSampleBytes(
  target: Uint8Array,
  offset: number,
  value: number,
  bitsPerSample: 8 | 16,
  endian: TiffImageFormat["endian"],
) {
  if (bitsPerSample === 8) {
    target[offset] = value & 0xff;
    return;
  }
  if (endian === "II") {
    target[offset] = value & 0xff;
    target[offset + 1] = value >> 8;
    return;
  }
  target[offset] = value >> 8;
  target[offset + 1] = value & 0xff;
}

function compressTiffStrip(data: Uint8Array, compression: number): Uint8Array {
  if (compression === 1) return data;
  if (compression === 8) return deflateSync(data);
  throw new Error(`Unsupported TIFF compression for export: ${compression}`);
}

function buildIfd(
  width: number,
  height: number,
  profile: TiffImageFormat,
  stripOffset: number,
  stripByteCount: number,
): Record<string, number[]> {
  const ifd: Record<string, number[]> = {
    t256: [width],
    t257: [height],
    t258: [profile.bitsPerSample],
    t259: [profile.compression],
    t262: [profile.photometric],
    t273: [stripOffset],
    t277: [profile.samplesPerPixel],
    t278: [Math.min(height, profile.rowsPerStrip)],
    t279: [stripByteCount],
    t284: [profile.planarConfiguration],
  };
  if (profile.predictor != null && profile.compression !== 1) {
    ifd.t317 = [profile.predictor];
  }
  return ifd;
}

export function encodeGrayTiff(
  width: number,
  height: number,
  pixels: Uint8Array | Uint16Array,
  profile: TiffImageFormat,
): Uint8Array {
  if (profile.samplesPerPixel !== 1) {
    throw new Error("Only single-sample grayscale TIFF export is supported.");
  }
  if (profile.bitsPerSample === 8 && !(pixels instanceof Uint8Array)) {
    const packed = new Uint8Array(pixels.length);
    for (let index = 0; index < pixels.length; index += 1) {
      packed[index] = Number(pixels[index] ?? 0) & 0xff;
    }
    pixels = packed;
  }
  if (profile.bitsPerSample === 16 && !(pixels instanceof Uint16Array)) {
    throw new Error("16-bit TIFF export requires uint16 pixels.");
  }

  const sampleCount = width * height;
  const bytesPerSample = profile.bitsPerSample === 16 ? 2 : 1;
  const raw = new Uint8Array(sampleCount * bytesPerSample);
  for (let index = 0; index < sampleCount; index += 1) {
    writeSampleBytes(
      raw,
      index * bytesPerSample,
      Number(pixels[index] ?? 0),
      profile.bitsPerSample,
      profile.endian,
    );
  }

  const strip = compressTiffStrip(raw, profile.compression);
  const file = new Uint8Array(TIFF_HEADER_SIZE + strip.length);
  writeTiffHeader(file, profile.endian, 8);
  const ifd = buildIfd(width, height, profile, TIFF_HEADER_SIZE, strip.length);
  utif._writeIFD(tiffBinary(profile.endian), file, 8, ifd);
  file.set(strip, TIFF_HEADER_SIZE);
  return file;
}

/** @deprecated Use encodeGrayTiff with a profile instead. */
export function encodeGray16Tiff(width: number, height: number, pixels: Uint16Array): Uint8Array {
  return encodeGrayTiff(width, height, pixels, {
    kind: "tiff",
    endian: "MM",
    bitsPerSample: 16,
    compression: 1,
    photometric: 1,
    samplesPerPixel: 1,
    rowsPerStrip: height,
    planarConfiguration: 1,
  });
}
