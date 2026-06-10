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
  file.set(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength), TIFF_HEADER_SIZE);
  return file;
}
