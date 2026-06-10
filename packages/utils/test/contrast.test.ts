import type { FrameResult } from "../src/frame";
import { describe, expect, it } from "vitest";

import {
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
  it("deriveAutoContrast prefers applied over suggested", () => {
    expect(deriveAutoContrast(frame)).toEqual({ min: 200, max: 30000 });
  });

  it("deriveAutoContrast falls back to domain when frame is null", () => {
    expect(deriveAutoContrast(null)).toEqual({ min: 0, max: 255 });
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
});
