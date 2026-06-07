import { describe, expect, test } from "vitest";

import {
  createInitialStudioWizardState,
  isBasicInfoDirty,
  serializeBasicInfoSnapshot,
} from "../src/state/studio-store";

describe("basic info leave guard snapshot", () => {
  test("is not dirty on initial wizard state", () => {
    const initial = createInitialStudioWizardState();
    expect(isBasicInfoDirty(initial)).toBe(false);
  });

  test("is dirty after editing basic info", () => {
    const initial = createInitialStudioWizardState();
    const edited = {
      ...initial,
      info1: { ...initial.info1, name: "Experiment A" },
    };
    expect(isBasicInfoDirty(edited)).toBe(true);
  });

  test("is not dirty after marking saved snapshot", () => {
    const initial = createInitialStudioWizardState();
    const edited = {
      ...initial,
      info1: { ...initial.info1, name: "Experiment A" },
      basicInfoSavedSnapshot: serializeBasicInfoSnapshot({
        ...initial,
        info1: { ...initial.info1, name: "Experiment A" },
      }),
    };
    expect(isBasicInfoDirty(edited)).toBe(false);
  });
});
