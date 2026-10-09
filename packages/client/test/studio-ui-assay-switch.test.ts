import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { beforeEach, describe, expect, test } from "vite-plus/test";

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

  test("switching transfection -> killing replaces the gene-expression default with 5 minutes", () => {
    const { set, get } = drive(createInitialStudioWizardState());

    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);

    expect(get().assayId).toBe(ASSAY_TYPE.KILLING);
    expect(get().intervalValue).toBe(5);
  });

  test("switching transfection -> killing persists the killing default into assay.json", () => {
    const { set, get } = drive(createInitialStudioWizardState());

    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);

    const json = buildStudioAssayJsonFromWizard(get());
    expect(json.interval.value).toBe(5);
    expect(json.interval.unit).toBe("minute");
    expect(json.type).toBe(ASSAY_TYPE.KILLING);
  });

  test("a user-entered interval survives switching assays", () => {
    const { set, get } = drive(createInitialStudioWizardState());
    studioWizardActions.patchWizard(set, { intervalValue: 7 });

    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);

    expect(get().assayId).toBe(ASSAY_TYPE.KILLING);
    expect(get().intervalValue).toBe(7);

    const json = buildStudioAssayJsonFromWizard(get());
    expect(json.interval.value).toBe(7);

    studioWizardActions.setAssayId(set, ASSAY_TYPE.TRANSFECTION);
    expect(get().intervalValue).toBe(7);
    expect(buildStudioAssayJsonFromWizard(get()).interval.value).toBe(7);
  });

  test("the transfection default of 10 is replaced by the killing default", () => {
    const { set, get } = drive(createInitialStudioWizardState());
    studioWizardActions.patchWizard(set, { intervalValue: 10 });

    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);

    expect(get().assayId).toBe(ASSAY_TYPE.KILLING);
    expect(get().intervalValue).toBe(5);
  });

  test("switching killing -> transfection replaces the killing default with 10 minutes", () => {
    const { set, get } = drive(createInitialStudioWizardState());
    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);
    expect(get().intervalValue).toBe(5);

    studioWizardActions.setAssayId(set, ASSAY_TYPE.TRANSFECTION);

    expect(get().assayId).toBe(ASSAY_TYPE.TRANSFECTION);
    expect(get().intervalValue).toBe(10);
  });

  test("a cleared interval survives writeStudioSession -> readStudioSession", () => {
    const { set, get } = drive(createInitialStudioWizardState());

    studioWizardActions.setAssayId(set, ASSAY_TYPE.KILLING);
    studioWizardActions.patchWizard(set, { intervalValue: null });
    expect(get().intervalValue).toBeNull();

    const restored = readStudioSession();
    expect(restored).not.toBeNull();
    expect(restored?.assayId).toBe(ASSAY_TYPE.KILLING);
    expect(restored?.intervalValue).toBeNull();
  });
});
