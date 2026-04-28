import { describe, expect, test } from "bun:test";

import {
  nextStudioPath,
  studioPathToStep,
  studioStepToPath,
} from "../../../../../apps/studio/src/studioRoutes";
import type {
  BasicInfoStep1,
  BasicInfoStep2,
  BasicInfoStep3,
} from "../../../../../apps/studio/src/studioStore";

const validInfo1: BasicInfoStep1 = {
  name: "assay",
  date: "2026-04-27",
  dataPath: "/data",
  saveTo: "/out",
};

const validInfo2: BasicInfoStep2 = {
  pattern: "Q20",
  timelapseAmount: 5,
  timelapseUnit: "minute",
  selectedFeature: "totalfluor",
};

const validInfo3: BasicInfoStep3 = {
  selectedSlideId: "slide-1",
  samples: [{ channel: "0", name: "sample", positions: "0:10" }],
};

describe("studio route helpers", () => {
  test("maps steps to routes and routes back to steps", () => {
    expect(studioStepToPath("welcome")).toBe("/choose-assay");
    expect(studioStepToPath("info1")).toBe("/basic-info/1");
    expect(studioStepToPath("info2")).toBe("/basic-info/2");
    expect(studioStepToPath("info3")).toBe("/basic-info/3");
    expect(studioStepToPath("alignPattern")).toBe("/align-pattern");
    expect(studioPathToStep("/basic-info/2")).toBe("info2");
    expect(studioPathToStep("/missing")).toBeNull();
  });

  test("validates next route transitions", () => {
    expect(
      nextStudioPath({
        step: "welcome",
        assayId: "custom-assay",
        info1: validInfo1,
        info2: validInfo2,
        info3: validInfo3,
      }),
    ).toBe("/basic-info/1");

    expect(
      nextStudioPath({
        step: "info1",
        assayId: "custom-assay",
        info1: { ...validInfo1, name: "" },
        info2: validInfo2,
        info3: validInfo3,
      }),
    ).toBeNull();

    expect(
      nextStudioPath({
        step: "info2",
        assayId: "custom-assay",
        info1: validInfo1,
        info2: validInfo2,
        info3: validInfo3,
      }),
    ).toBe("/basic-info/3");

    expect(
      nextStudioPath({
        step: "info3",
        assayId: "custom-assay",
        info1: validInfo1,
        info2: validInfo2,
        info3: validInfo3,
      }),
    ).toBe("/align-pattern");
  });
});
