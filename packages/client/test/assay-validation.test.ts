import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { describe, expect, it } from "vitest";

import { createInitialStudioWizardState } from "../src/atoms/studio-ui";
import {
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
        brightfield: row.brightfield || "0",
        fluorescence: row.fluorescence || "1",
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
    }
  });

  it("accepts a complete wizard snapshot", () => {
    const initial = createInitialStudioWizardState();
    const samples = initial.samples.map((row, index) =>
      Object.assign({}, row, {
        name: row.name || `sample-${index}`,
        positionStart: "1",
        positionFinish: "4",
        brightfield: row.brightfield || "0",
        fluorescence: row.fluorescence || "1",
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
});
