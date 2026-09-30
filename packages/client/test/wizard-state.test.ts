import { describe, expect, test } from "vite-plus/test";

import {
  createInitialStudioWizardState,
  isBasicInfoDirty as isStudioWizardDirty,
  studioWizardActions,
} from "../src/atoms/studio-ui";
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
      name: "Experiment A",
    };
    expect(
      isBasicInfoDirty(edited, serializeBasicInfoSnapshot(createInitialStudioWizardState())),
    ).toBe(true);
  });

  test("is not dirty after marking saved snapshot", () => {
    const initial = createInitialStudioWizardState();
    const edited = {
      ...initial,
      name: "Experiment A",
      basicInfoSavedSnapshot: serializeBasicInfoSnapshot({
        ...initial,
        name: "Experiment A",
      }),
    };
    expect(
      isBasicInfoDirty(edited, serializeBasicInfoSnapshot(createInitialStudioWizardState())),
    ).toBe(false);
  });

  test("a blank assay of any type is not dirty, and New resets to one", () => {
    let state = { ...createInitialStudioWizardState(), name: "TF84", workspacePath: "/data/ws" };
    const set = (update: typeof state | ((current: typeof state) => typeof state)) => {
      state = typeof update === "function" ? update(state) : update;
    };
    expect(isStudioWizardDirty(state)).toBe(true);

    studioWizardActions.newAssay(set, "killing");
    expect(state.assayId).toBe("killing");
    expect(state.name).toBe("");
    expect(state.workspacePath).toBe("");
    expect(state.basicInfoSavedSnapshot).toBeNull();
    expect(isStudioWizardDirty(state)).toBe(false);

    studioWizardActions.newAssay(set, "transfection");
    expect(isStudioWizardDirty(state)).toBe(false);
  });
});
