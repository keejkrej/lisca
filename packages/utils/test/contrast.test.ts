import { defaultContrastDomain, type FrameResult } from "../src/frame";
import { describe, expect, it } from "vite-plus/test";

import {
  contrastForFrameChange,
  deriveAutoContrast,
  deriveContrastControlState,
  deriveContrastUiState,
} from "../src/contrast";

const frame: FrameResult = {
  width: 1,
  height: 1,
  pixels: new Uint8Array([0]),
  contrastDomain: { min: 0, max: 65535 },
  suggestedContrast: { min: 100, max: 40000 },
  appliedContrast: { min: 200, max: 30000 },
};

describe("contrast helpers", () => {
  it("derives the default domain from the pixel type", () => {
    expect(defaultContrastDomain("uint8")).toEqual({ min: 0, max: 255 });
    expect(defaultContrastDomain("uint16")).toEqual({ min: 0, max: 65535 });
    expect(defaultContrastDomain(undefined)).toEqual({ min: 0, max: 65535 });
  });

  it("uses pixel-type defaults when a frame does not provide a domain", () => {
    const uint8Frame: FrameResult = {
      width: 1,
      height: 1,
      pixels: new Uint8Array([0]),
      pixelType: "uint8",
    };
    const uint16Frame: FrameResult = {
      width: 1,
      height: 1,
      pixels: new Uint16Array([0]),
      pixelType: "uint16",
    };

    expect(deriveContrastControlState(uint8Frame, null).domain).toEqual({ min: 0, max: 255 });
    expect(deriveContrastControlState(uint16Frame, null).domain).toEqual({
      min: 0,
      max: 65535,
    });
  });

  it("deriveAutoContrast prefers applied over suggested", () => {
    expect(deriveAutoContrast(frame)).toEqual({ min: 200, max: 30000 });
  });

  it("deriveAutoContrast falls back to domain when frame is null", () => {
    expect(deriveAutoContrast(null)).toEqual({ min: 0, max: 65535 });
    expect(deriveContrastControlState(null, null)).toMatchObject({
      domain: { min: 0, max: 65535 },
      value: { min: 0, max: 65535 },
    });
  });

  it("deriveContrastUiState uses manual contrast when set", () => {
    expect(deriveContrastUiState(frame, { min: 10, max: 20 })).toEqual({
      contrastDomain: { min: 0, max: 65535 },
      contrastMin: 10,
      contrastMax: 20,
    });
  });

  it("deriveContrastUiState uses auto contrast when contrast is null", () => {
    expect(deriveContrastUiState(frame, null)).toEqual({
      contrastDomain: { min: 0, max: 65535 },
      contrastMin: 200,
      contrastMax: 30000,
    });
  });

  it("deriveContrastControlState exposes value from manual contrast", () => {
    const manual = { min: 5, max: 50 };
    expect(deriveContrastControlState(frame, manual).value).toEqual(manual);
  });

  it("contrastForFrameChange asks for auto while contrast is unlocked", () => {
    expect(contrastForFrameChange(null, false, frame)).toBeNull();
    expect(contrastForFrameChange({ min: 5, max: 50 }, false, frame)).toBeNull();
  });

  it("contrastForFrameChange keeps a locked manual window", () => {
    const manual = { min: 5, max: 50 };
    expect(contrastForFrameChange(manual, true, frame)).toBe(manual);
  });

  it("contrastForFrameChange locks the outgoing frame's window when none is pinned", () => {
    expect(contrastForFrameChange(null, true, frame)).toEqual({ min: 200, max: 30000 });
    expect(contrastForFrameChange(null, true, null)).toEqual({ min: 0, max: 65535 });
  });
});
