import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/storage";
import { beforeEach, describe, expect, it } from "vitest";

import { readStudioWizardMemoryRecent, touchStudioWizardMemory } from "../src/studio/wizard-memory";

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

describe("studio wizard memory", () => {
  beforeEach(() => {
    configureLiscaStorage({ local: createMemoryStorage() });
  });

  it("records and returns recent workspaces", () => {
    touchStudioWizardMemory({ kind: "workspace", path: "/data/run-a", label: "Run A" });
    touchStudioWizardMemory({ kind: "workspace", path: "/data/run-b" });

    expect(readStudioWizardMemoryRecent("workspace").workspaces).toEqual([
      { path: "/data/run-b", label: undefined },
      { path: "/data/run-a", label: "Run A" },
    ]);
  });

  it("dedupes sources and assays by identity", () => {
    touchStudioWizardMemory({
      kind: "source",
      source: { kind: "nd2", path: "/data/sample.nd2" },
      label: "first",
    });
    touchStudioWizardMemory({
      kind: "source",
      source: { kind: "nd2", path: "/data/sample.nd2" },
      label: "again",
    });
    touchStudioWizardMemory({
      kind: "assay",
      path: "/data/run/assay.json",
      assayLabel: "Gene expr",
      workspacePath: "/data/run",
    });
    touchStudioWizardMemory({
      kind: "assay",
      path: "/data/run/assay.json",
      assayLabel: "Updated",
    });

    expect(readStudioWizardMemoryRecent("source").sources).toEqual([
      {
        source: { kind: "nd2", path: "/data/sample.nd2" },
        label: "again",
      },
    ]);
    expect(readStudioWizardMemoryRecent("assay").assays).toEqual([
      {
        path: "/data/run/assay.json",
        assayLabel: "Updated",
        workspacePath: undefined,
      },
    ]);
  });
});
