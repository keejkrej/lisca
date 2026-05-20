export const WS_PATH = "/ws" as const;

export const PIXEL_TYPES = [
  "uint8",
  "uint8clamped",
  "int8",
  "uint16",
  "int16",
  "uint32",
  "int32",
] as const;

export type PixelType = (typeof PIXEL_TYPES)[number];
