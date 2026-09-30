import { ASSAY_TYPE, type StudioAssaySampleRow } from "@lisca/contracts/assay";
import { describe, expect, it } from "vite-plus/test";

import { createInitialStudioWizardState } from "../src/atoms/studio-ui";
import {
  duplicateSampleNames,
  validateAssayForAnalysis,
  validAssayIdentity,
  validAssaySamples,
} from "../src/studio/assay-validation";

describe("assay validation", () => {
  it("validates identity fields", () => {
    const initial = createInitialStudioWizardState();
    expect(
      validAssayIdentity({
        name: initial.name,
        dataPath: initial.dataPath,
        workspacePath: initial.workspacePath,
      }),
    ).toBe(false);
    expect(
      validAssayIdentity({
        name: "Run A",
        dataPath: "/data",
        workspacePath: "/save",
      }),
    ).toBe(true);
  });

  it("validates sample rows", () => {
    const initial = createInitialStudioWizardState();
    const samples = initial.samples.map((row, index) =>
      Object.assign({}, row, {
        name: row.name || `sample-${index}`,
        positionStart: "1",
        positionFinish: "4",
        segmentation: row.segmentation || "0",
        signal: row.signal || "1",
      }),
    );
    expect(validAssaySamples(samples)).toBe(true);
  });

  it("reports missing assay and incomplete steps", () => {
    const initial = createInitialStudioWizardState();
    const result = validateAssayForAnalysis({
      assayId: null,
      name: initial.name,
      dataPath: initial.dataPath,
      workspacePath: initial.workspacePath,
      intervalValue: initial.intervalValue,
      intervalUnit: initial.intervalUnit,
      samples: initial.samples,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("Choose an assay type");
      expect(result.errors).toContain("Complete the Metadata step (name, source, workspace).");
    }
  });

  it("accepts a complete wizard snapshot", () => {
    const initial = createInitialStudioWizardState();
    const samples = initial.samples.map((row, index) =>
      Object.assign({}, row, {
        name: row.name || `sample-${index}`,
        positionStart: "1",
        positionFinish: "4",
        segmentation: row.segmentation || "0",
        signal: row.signal || "1",
      }),
    );
    const result = validateAssayForAnalysis({
      assayId: ASSAY_TYPE.TRANSFECTION,
      name: "Run A",
      dataPath: "/data",
      workspacePath: "/save",
      intervalValue: 5,
      intervalUnit: "minute",
      samples,
    });
    expect(result.ok).toBe(true);
  });

  it("reports blank sample names", () => {
    const result = validateAssayForAnalysis({
      assayId: ASSAY_TYPE.TRANSFECTION,
      name: "Run A",
      dataPath: "/data",
      workspacePath: "/save",
      intervalValue: 5,
      intervalUnit: "minute",
      samples: [sampleRow("sample:0", "Control"), sampleRow("sample:1", "   ")],
    });
    expect(result).toEqual({
      ok: false,
      errors: ["Sample row 2: sample name must be non-empty."],
    });
    expect(validAssaySamples([sampleRow("sample:0", "   ")])).toBe(false);
  });

  it("reports duplicate sample names compared after trimming", () => {
    const samples = [
      sampleRow("sample:0", "Control"),
      sampleRow("sample:1", " Control "),
      sampleRow("sample:2", "Treated"),
    ];
    expect(duplicateSampleNames(samples)).toEqual(["Control"]);
    expect(validAssaySamples(samples)).toBe(false);
    const result = validateAssayForAnalysis({
      assayId: ASSAY_TYPE.TRANSFECTION,
      name: "Run A",
      dataPath: "/data",
      workspacePath: "/save",
      intervalValue: 5,
      intervalUnit: "minute",
      samples,
    });
    expect(result).toEqual({
      ok: false,
      errors: ['Sample name "Control" is used by more than one sample; names must be unique.'],
    });
  });
});

function sampleRow(id: string, name: string): StudioAssaySampleRow {
  return { id, name, positionStart: "0", positionFinish: "1", segmentation: "0", signal: "1" };
}
