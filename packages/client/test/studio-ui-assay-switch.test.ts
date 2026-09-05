import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { beforeEach, describe, expect, test } from "vitest";

import {
  buildStudioAssayJsonFromWizard,
  createInitialStudioWizardState,
  readStudioSession,
  studioWizardActions,
  type StudioWizardState,
} from "../src/atoms/studio-ui";

type StateUpdater<T> = T | ((current: T) => T);

function createMemoryStorage(): LiscaStorageAdapter {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

function drive(initial: StudioWizardState) {
  let state = initial;
  const set = (update: StateUpdater<StudioWizardState>) => {
    state = typeof update === "function" ? update(state) : update;
  };
  return { set, get: () => state };
}

describe("setAssayId interval handling", () => {
  beforeEach(() => {
    configureLiscaStorage({ session: createMemoryStorage() });
  });

  test("wizard seeds with the transfection default assay and 10 min interval", () => {
    const state = createInitialStudioWizardState();
    expect(state.assayId).toBe(ASSAY_TYPE.TRANSFECTION);
    expect(state.intervalValue).toBe(10);
  });

  test("switching transfection -> killing clears the leaked transfection default", () => {
    const { set, get } = drive(createInitialStudioWizardState());

    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);

    expect(get().assayId).toBe(ASSAY_TYPE.KILLING);
    expect(get().intervalValue).toBeNull();
  });

  test("switching transfection -> killing no longer persists interval.value = 10 into assay.json", () => {
    const { set, get } = drive(createInitialStudioWizardState());

    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);

    const json = buildStudioAssayJsonFromWizard(get());
    expect(json.interval.value).toBeNull();
    expect(json.interval.unit).toBe("minute");
    expect(json.type).toBe(ASSAY_TYPE.KILLING);
  });

  test("a user-entered interval survives switching to a no-default assay", () => {
    const { set, get } = drive(createInitialStudioWizardState());
    studioWizardActions.patchWizard(set, { intervalValue: 7 });

    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);

    expect(get().assayId).toBe(ASSAY_TYPE.KILLING);
    expect(get().intervalValue).toBe(7);

    const json = buildStudioAssayJsonFromWizard(get());
    expect(json.interval.value).toBe(7);
  });

  test("an interval equal to the prior assay default is treated as a default and replaced", () => {
    const { set, get } = drive(createInitialStudioWizardState());
    studioWizardActions.patchWizard(set, { intervalValue: 10 });

    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);

    expect(get().assayId).toBe(ASSAY_TYPE.KILLING);
    expect(get().intervalValue).toBeNull();
  });

  test("switching killing -> transfection restores the transfection default interval", () => {
    const { set, get } = drive(createInitialStudioWizardState());
    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);
    expect(get().intervalValue).toBeNull();

    studioWizardActions.setAssayId(set, ASSAY_TYPE.TRANSFECTION);

    expect(get().assayId).toBe(ASSAY_TYPE.TRANSFECTION);
    expect(get().intervalValue).toBe(10);
  });

  test("null killing interval survives writeStudioSession -> readStudioSession", () => {
    const { set, get } = drive(createInitialStudioWizardState());

    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);
    expect(get().intervalValue).toBeNull();

    const restored = readStudioSession();
    expect(restored).not.toBeNull();
    expect(restored?.assayId).toBe(ASSAY_TYPE.KILLING);
    expect(restored?.intervalValue).toBeNull();
  });
});
