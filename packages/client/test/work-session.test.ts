import { configureLiscaStorage, liscaLocalStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  isValidWorkSession,
  readWorkSessions,
  studioAssayJsonPathForSaveTo,
  touchAlignerWorkSessionFromState,
  touchStudioWorkSessionFromAssayPath,
  touchWorkSession,
} from "../src/session/work-session";

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

describe("work-session registry", () => {
  beforeEach(() => {
    configureLiscaStorage({
      local: createMemoryStorage(),
      session: createMemoryStorage(),
    });
    vi.stubGlobal("crypto", {
      randomUUID: () => "session-id-1",
    });
  });

  it("aligner requires workspace and source", () => {
    expect(
      touchWorkSession("aligner", {
        workspacePath: "/data/ws-a",
      }),
    ).toBeNull();
    expect(readWorkSessions("aligner")).toHaveLength(0);

    touchWorkSession("aligner", {
      workspacePath: "/data/ws-a",
      source: {
        kind: "folder",
        path: "/data/src",
        subfolderTemplate: "Pos{pos}",
        filenameTemplate: "img.tif",
      },
    });
    expect(readWorkSessions("aligner")).toHaveLength(1);
  });

  it("annotator requires only workspace", () => {
    touchWorkSession("annotator", { workspacePath: "/data/ws-a" });
    touchWorkSession("annotator", { workspacePath: "/data/ws-b" });
    const sessions = readWorkSessions("annotator");
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.workspacePath).toBe("/data/ws-b");
  });

  it("studio requires assay.json path", () => {
    expect(
      touchWorkSession("studio", {
        workspacePath: "/data/ws-a",
      }),
    ).toBeNull();

    touchStudioWorkSessionFromAssayPath("/data/run/assay.json", "Gene expr");
    const sessions = readWorkSessions("studio");
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.assayJsonPath).toBe("/data/run/assay.json");
    expect(sessions[0]?.label).toBe("Gene expr");
  });

  it("touchAlignerWorkSessionFromState ignores incomplete state", () => {
    touchAlignerWorkSessionFromState({
      workspacePath: "/data/ws-a",
      source: null,
    });
    expect(readWorkSessions("aligner")).toHaveLength(0);
  });

  it("studioAssayJsonPathForSaveTo appends assay.json", () => {
    expect(studioAssayJsonPathForSaveTo("/data/run/")).toBe("/data/run/assay.json");
  });

  it("ignores the legacy server field on stored sessions and dedupes by path", () => {
    // Sessions saved before the server-identity removal still carry a `server` field.
    liscaLocalStorage().setItem(
      "lisca.workSessions.studio",
      JSON.stringify([
        {
          id: "a",
          server: "http://remote:8767",
          assayJsonPath: "/run-a/assay.json",
          lastOpenedAt: "2026-06-15T10:00:00.000Z",
        },
        {
          id: "b",
          server: "local",
          assayJsonPath: "/run-b/assay.json",
          lastOpenedAt: "2026-06-15T09:00:00.000Z",
        },
      ]),
    );
    expect(readWorkSessions("studio").map((session) => session.id)).toEqual(["a", "b"]);

    touchStudioWorkSessionFromAssayPath("/run-b/assay.json");
    const sessions = readWorkSessions("studio");
    expect(sessions.map((session) => session.assayJsonPath)).toEqual([
      "/run-b/assay.json",
      "/run-a/assay.json",
    ]);
    expect(sessions[0]).not.toHaveProperty("server");
  });

  it("migrates legacy aligner session storage only when source is present", () => {
    configureLiscaStorage({
      local: createMemoryStorage(),
      session: (() => {
        const storage = createMemoryStorage();
        storage.setItem(
          "lisca-aligner-session",
          JSON.stringify({
            workspacePath: "/legacy/ws",
            source: { kind: "folder", path: "/legacy/src" },
          }),
        );
        return storage;
      })(),
    });
    const sessions = readWorkSessions("aligner");
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.workspacePath).toBe("/legacy/ws");
    expect(isValidWorkSession("aligner", sessions[0]!)).toBe(true);
  });

  it("migrates legacy annotator session storage", () => {
    configureLiscaStorage({
      local: createMemoryStorage(),
      session: (() => {
        const storage = createMemoryStorage();
        storage.setItem("lisca-annotator-session", JSON.stringify({ workspacePath: "/legacy/ws" }));
        return storage;
      })(),
    });
    const sessions = readWorkSessions("annotator");
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.workspacePath).toBe("/legacy/ws");
  });
});
