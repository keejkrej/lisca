import { readStudioWizardMemoryRecent } from "@lisca/client/studio/wizard-memory";
import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import {
  buildStudioAssayJsonFromWizard,
  createInitialStudioWizardState,
} from "../src/state/studio-store";
import { recordStudioAssayMemory } from "../src/utils/studio-memory";

function createMemoryStorage(): LiscaStorageAdapter {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

beforeEach(() => configureLiscaStorage({ local: createMemoryStorage() }));

describe("recordStudioAssayMemory", () => {
  it("remembers the assay plus its workspace and source for the other pickers", () => {
    const assayJson = buildStudioAssayJsonFromWizard({
      ...createInitialStudioWizardState(),
      name: "TF84",
      dataSourceKind: "nd2",
      dataPath: "/data/TF84.nd2",
      workspacePath: "/data/TF84_portable",
    });
    recordStudioAssayMemory("/data/TF84_portable/assay.json", assayJson);

    expect(readStudioWizardMemoryRecent("assay").assays).toMatchObject([
      { path: "/data/TF84_portable/assay.json", assayLabel: "TF84" },
    ]);
    expect(readStudioWizardMemoryRecent("workspace").workspaces).toEqual([
      { path: "/data/TF84_portable", label: "TF84" },
    ]);
    expect(readStudioWizardMemoryRecent("source").sources).toMatchObject([
      { source: { kind: "nd2", path: "/data/TF84.nd2" } },
    ]);
  });
});
