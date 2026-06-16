import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/storage";
import { setLiscaActiveServerAddress } from "@lisca/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  currentServerKey,
  isValidWorkSession,
  readWorkSessions,
  removeWorkSession,
  resolveServerKey,
  sessionsForServer,
  studioAssayJsonPathForSaveTo,
  touchAlignerWorkSessionFromState,
  touchStudioWorkSessionFromAssayPath,
  touchWorkSession,
  writeWorkSessions,
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
    setLiscaActiveServerAddress(null);
    vi.stubGlobal("crypto", {
      randomUUID: () => "session-id-1",
    });
  });

  it("resolveServerKey normalizes active server addresses", () => {
    expect(resolveServerKey(null, 8765)).toBe("local");
    expect(resolveServerKey("192.168.1.10:8765", 8765)).toBe("http://192.168.1.10:8765");
  });

  it("aligner requires workspace and source", () => {
    expect(
      touchWorkSession("aligner", {
        server: "local",
        workspacePath: "/data/ws-a",
      }),
    ).toBeNull();
    expect(readWorkSessions("aligner")).toHaveLength(0);

    touchWorkSession("aligner", {
      server: "local",
      workspacePath: "/data/ws-a",
      source: { kind: "folder", path: "/data/src" },
    });
    expect(readWorkSessions("aligner")).toHaveLength(1);
  });

  it("annotator requires only workspace", () => {
    touchWorkSession("annotator", { server: "local", workspacePath: "/data/ws-a" });
    touchWorkSession("annotator", { server: "local", workspacePath: "/data/ws-b" });
    const sessions = readWorkSessions("annotator");
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.workspacePath).toBe("/data/ws-b");
  });

  it("studio requires assay.json path", () => {
    expect(
      touchWorkSession("studio", {
        server: "local",
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

  it("sessionsForServer filters by normalized server key", () => {
    writeWorkSessions("studio", [
      {
        id: "a",
        server: "http://remote:8767",
        assayJsonPath: "/remote/run/assay.json",
        lastOpenedAt: "2026-06-15T10:00:00.000Z",
      },
      {
        id: "b",
        server: "local",
        assayJsonPath: "/local/run/assay.json",
        lastOpenedAt: "2026-06-15T09:00:00.000Z",
      },
    ]);
    expect(sessionsForServer(readWorkSessions("studio"), "local")).toHaveLength(1);
    expect(currentServerKey("studio")).toBe("local");
  });

  it("removeWorkSession deletes by id", () => {
    const session = touchWorkSession("annotator", {
      server: "local",
      workspacePath: "/data/ws-a",
    });
    expect(session).not.toBeNull();
    removeWorkSession("annotator", session!.id);
    expect(readWorkSessions("annotator")).toEqual([]);
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
});
