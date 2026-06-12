import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { describe, expect, it } from "vitest";

import { createStudioUi } from "../src/atoms/studio-ui";
import { validateAssayForAnalysis, validInfo1, validInfo3 } from "../src/studio/assay-validation";

const { createInitialStudioWizardState } = createStudioUi();

describe("assay validation", () => {
  it("validates complete basic info step 1", () => {
    const initial = createInitialStudioWizardState();
    expect(validInfo1(initial.info1)).toBe(false);
    expect(
      validInfo1({
        ...initial.info1,
        name: "Run A",
        date: "2026-01-01",
        dataPath: "/data",
        saveTo: "/save",
      }),
    ).toBe(true);
  });

  it("validates sample rows on active slide", () => {
    const initial = createInitialStudioWizardState();
    const info3 = {
      ...initial.info3,
      samplesBySlide: {
        ...initial.info3.samplesBySlide,
        [initial.info3.selectedSlideId]: initial.info3.samplesBySlide[
          initial.info3.selectedSlideId
        ].map((row, index) =>
          Object.assign({}, row, {
            name: row.name || `sample-${index}`,
            positionStart: "1",
            positionFinish: "4",
            maskChannel: row.maskChannel || "0",
            signalChannel: row.signalChannel || "1",
          }),
        ),
      },
    };
    expect(validInfo3(info3)).toBe(true);
  });

  it("reports missing assay and incomplete steps", () => {
    const initial = createInitialStudioWizardState();
    const result = validateAssayForAnalysis({
      assayId: null,
      info1: initial.info1,
      info2: initial.info2,
      info3: initial.info3,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("Choose an assay type");
    }
  });

  it("accepts a complete wizard snapshot", () => {
    const initial = createInitialStudioWizardState();
    const info3 = {
      ...initial.info3,
      samplesBySlide: {
        ...initial.info3.samplesBySlide,
        [initial.info3.selectedSlideId]: initial.info3.samplesBySlide[
          initial.info3.selectedSlideId
        ].map((row, index) =>
          Object.assign({}, row, {
            name: row.name || `sample-${index}`,
            positionStart: "1",
            positionFinish: "4",
            maskChannel: row.maskChannel || "0",
            signalChannel: row.signalChannel || "1",
          }),
        ),
      },
    };
    const result = validateAssayForAnalysis({
      assayId: ASSAY_TYPE.GENE_EXPRESSION,
      info1: {
        ...initial.info1,
        name: "Run A",
        date: "2026-01-01",
        dataPath: "/data",
        saveTo: "/save",
      },
      info2: {
        ...initial.info2,
        pattern: "square",
        timelapseAmount: 5,
      },
      info3,
    });
    expect(result.ok).toBe(true);
  });
});
