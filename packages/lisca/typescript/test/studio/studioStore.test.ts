import { describe, expect, test } from "bun:test";

import {
  buildStudioAssayJson,
  parseStudioAssayJson,
  type BasicInfoStep1,
  type BasicInfoStep2,
  type BasicInfoStep3,
} from "../../../../../apps/studio/src/studioStore";

const info1: BasicInfoStep1 = {
  name: "mt",
  date: "2026-03-30",
  dataPath: "Z:\\projects\\LISCA\\Experiments\\20260330_MT\\260330\\image.nd2",
  saveTo: "C:\\Users\\ctyja\\data\\20260330",
};

const info2: BasicInfoStep2 = {
  pattern: "30 um",
  timelapseAmount: 10,
  timelapseUnit: "minute",
  selectedFeature: "totalfluor",
};

const info3: BasicInfoStep3 = {
  selectedSlideId: "slide-vi",
  samplesBySlide: {
    "slide-i": [{ channel: "0", name: "", positions: "" }],
    "slide-vi": [
      { channel: "0", name: "apexbio-egfp", positions: "0:12" },
      { channel: "1", name: "mt1-egfp", positions: "12:25" },
      { channel: "2", name: "mt1-egfp", positions: "25:35" },
      { channel: "3", name: "mt2-egfp", positions: "35:45" },
      { channel: "4", name: "mt2-egfp", positions: "45:53" },
      { channel: "5", name: "apexbio-mcherry", positions: "53:61" },
    ],
  },
};

describe("studio assay JSON", () => {
  test("parses saved assay metadata", () => {
    const assay = buildStudioAssayJson({
      assayId: "gene-expression",
      info1,
      info2,
      info3,
    });

    expect(parseStudioAssayJson(JSON.stringify(assay))).toEqual(assay);
  });

  test("reports missing nested strings with stable labels", () => {
    const assay = buildStudioAssayJson({
      assayId: "gene-expression",
      info1: { ...info1, name: "" },
      info2,
      info3,
    });
    const malformed = {
      ...assay,
      info1: {
        ...assay.info1,
        name: 3,
      },
    };

    expect(() => parseStudioAssayJson(JSON.stringify(malformed))).toThrow(
      "Invalid assay.json: info1.name must be a string.",
    );
  });
});
