import { describe, expect, it } from "vite-plus/test";

import { instructionForAnnotate, instructionForStep } from "../src/state/studio-routes";

describe("Studio instruction copy", () => {
  it("tells Metadata users to save then open Align", () => {
    expect(instructionForStep("metadata")).toMatch(/Press Save, then open Align/);
    expect(instructionForStep("metadata")).toMatch(/output folder/);
  });

  it("tells Align users to exclude multi-cell patterns and what expert mode adds", () => {
    const text = instructionForStep("alignPattern");
    expect(text).toMatch(/more than one cell/);
    expect(text).toMatch(/Expert mode/);
    expect(text).toMatch(/Drift/);
  });

  it("explains Annotate paint, analysis of every crop, and skip segmentation", () => {
    const text = instructionForAnnotate();
    expect(text).toMatch(/paint the ROI mask/);
    expect(text).toMatch(/every cropped ROI/);
    expect(text).toMatch(/Skip segmentation/);
  });
});
