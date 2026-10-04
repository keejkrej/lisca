import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import {
  readRecentMemory,
  recentSourceByPath,
  recentSourcePickerItems,
  touchRecentMemory,
} from "../src/session/recent-memory";
import { writeWorkSessions } from "../src/session/work-session";
import { readStudioWizardMemoryRecent } from "../src/studio/wizard-memory";

function createMemoryStorage(): LiscaStorageAdapter {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

const nd2 = { kind: "nd2" as const, path: "/data/run.nd2" };
const czi = { kind: "czi" as const, path: "/data/run.czi" };
const folder = {
  kind: "folder" as const,
  path: "/data/jb4_portable",
  subfolderTemplate: "{p}",
  filenameTemplate: "img_{t}.tif",
};

describe("recent memory", () => {
  let storage: LiscaStorageAdapter;
  beforeEach(() => {
    storage = createMemoryStorage();
    configureLiscaStorage({ local: storage });
  });

  it("keeps separate recents per app and per picker, newest first", () => {
    touchRecentMemory("aligner", { kind: "workspace", path: "/ws/a" });
    touchRecentMemory("aligner", { kind: "workspace", path: "/ws/b" });
    touchRecentMemory("aligner", { kind: "source", source: nd2 });
    touchRecentMemory("annotator", { kind: "workspace", path: "/ws/c" });

    const aligner = readRecentMemory("aligner");
    expect(aligner.workspaces.map((entry) => entry.path)).toEqual(["/ws/b", "/ws/a"]);
    expect(aligner.sources.map((entry) => entry.source)).toEqual([nd2]);
    expect(readRecentMemory("annotator").workspaces.map((entry) => entry.path)).toEqual(["/ws/c"]);
    expect(readRecentMemory("annotator").sources).toEqual([]);
  });

  it("keeps a label when the same workspace is touched again without one", () => {
    touchRecentMemory("aligner", { kind: "workspace", path: "/ws/a", label: "Run A" });
    touchRecentMemory("aligner", { kind: "workspace", path: "/ws/a" });
    expect(readRecentMemory("aligner").workspaces).toMatchObject([
      { path: "/ws/a", label: "Run A" },
    ]);
  });

  it("uses Studio's existing storage so its history survives", () => {
    touchRecentMemory("studio", { kind: "workspace", path: "/ws/s", label: "TF84" });
    expect(storage.getItem("lisca.studio.wizardMemory")).toContain("/ws/s");
    expect(readStudioWizardMemoryRecent("workspace").workspaces).toEqual([
      { path: "/ws/s", label: "TF84" },
    ]);
  });

  it("lists recent sources for the picker that matches their kind", () => {
    const sources = [
      { source: folder, label: "JB4" },
      { source: nd2 },
      { source: czi, label: "Run" },
    ];
    expect(recentSourcePickerItems(sources, "folder")).toEqual([
      { path: "/data/jb4_portable", label: "JB4" },
    ]);
    expect(recentSourcePickerItems(sources, "nd2_file")).toEqual([{ path: "/data/run.nd2" }]);
    expect(recentSourcePickerItems(sources, "czi_file")).toEqual([
      { path: "/data/run.czi", label: "Run" },
    ]);
    expect(recentSourcePickerItems(sources, "workspace")).toEqual([]);
    expect(recentSourceByPath(sources, "folder", "/data/jb4_portable")).toEqual(folder);
    expect(recentSourceByPath(sources, "nd2_file", "/data/jb4_portable")).toBeUndefined();
  });

  it("seeds Aligner recents from the saved sessions the resume dialog used", () => {
    writeWorkSessions("aligner", [
      { id: "1", workspacePath: "/ws/old", source: nd2, lastOpenedAt: "2026-01-01T00:00:00Z" },
      {
        id: "2",
        workspacePath: "/ws/new",
        source: czi,
        label: "New",
        lastOpenedAt: "2026-02-01T00:00:00Z",
      },
    ]);
    const seeded = readRecentMemory("aligner");
    expect(seeded.workspaces.map((entry) => entry.path)).toEqual(["/ws/new", "/ws/old"]);
    expect(seeded.sources.map((entry) => entry.source)).toEqual([czi, nd2]);

    touchRecentMemory("aligner", { kind: "workspace", path: "/ws/newest" });
    expect(readRecentMemory("aligner").workspaces.map((entry) => entry.path)).toEqual([
      "/ws/newest",
      "/ws/new",
      "/ws/old",
    ]);
  });
});
