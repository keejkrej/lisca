import UTIF from "utif";

const TIFF_HEADER_SIZE = 1000;

export function encodeGray16Tiff(width: number, height: number, pixels: Uint16Array): Uint8Array {
  const byteLength = width * height * 2;
  const ifd = {
    t256: [width],
    t257: [height],
    t258: [16],
    t259: [1],
    t262: [1],
    t273: [TIFF_HEADER_SIZE],
    t277: [1],
    t278: [height],
    t279: [byteLength],
    t284: [1],
  };
  const header = new Uint8Array(UTIF.encode([ifd as never]));
  const file = new Uint8Array(TIFF_HEADER_SIZE + byteLength);
  file.set(header, 0);
  let offset = TIFF_HEADER_SIZE;
  for (const value of pixels) {
    file[offset] = value & 0xff;
    file[offset + 1] = value >> 8;
    offset += 2;
  }
  return file;
}
