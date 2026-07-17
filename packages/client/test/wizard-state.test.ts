import { describe, expect, test } from "vitest";

import { createInitialStudioWizardState } from "../src/atoms/studio-ui";
import { isBasicInfoDirty, serializeBasicInfoSnapshot } from "../src/studio/wizard-state";

describe("basic info leave guard snapshot", () => {
  test("is not dirty on initial wizard state", () => {
    const initial = createInitialStudioWizardState();
    expect(
      isBasicInfoDirty(initial, serializeBasicInfoSnapshot(createInitialStudioWizardState())),
    ).toBe(false);
  });

  test("is dirty after editing basic info", () => {
    const initial = createInitialStudioWizardState();
    const edited = {
      ...initial,
      info1: { ...initial.info1, name: "Experiment A" },
    };
    expect(
      isBasicInfoDirty(edited, serializeBasicInfoSnapshot(createInitialStudioWizardState())),
    ).toBe(true);
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
    expect(
      isBasicInfoDirty(edited, serializeBasicInfoSnapshot(createInitialStudioWizardState())),
    ).toBe(false);
  });
});
