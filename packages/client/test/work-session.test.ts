import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/storage";
import { setLiscaActiveServerAddress } from "@lisca/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  currentServerKey,
  readWorkSessions,
  removeWorkSession,
  resolveServerKey,
  sessionsForServer,
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

  it("touchWorkSession upserts by server, workspace, and source", () => {
    touchWorkSession("aligner", {
      server: "local",
      workspacePath: "/data/ws-a",
      source: { kind: "folder", path: "/data/src" },
    });
    touchWorkSession("aligner", {
      server: "local",
      workspacePath: "/data/ws-b",
    });
    const sessions = readWorkSessions("aligner");
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.workspacePath).toBe("/data/ws-b");
    expect(sessions[1]?.workspacePath).toBe("/data/ws-a");
  });

  it("touchWorkSession moves an existing session to the front", () => {
    touchWorkSession("annotator", { server: "local", workspacePath: "/data/ws-a" });
    touchWorkSession("annotator", { server: "local", workspacePath: "/data/ws-b" });
    touchWorkSession("annotator", { server: "local", workspacePath: "/data/ws-a" });
    const sessions = readWorkSessions("annotator");
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.workspacePath).toBe("/data/ws-a");
  });

  it("sessionsForServer filters by normalized server key", () => {
    writeWorkSessions("studio", [
      {
        id: "a",
        server: "http://remote:8767",
        workspacePath: "/remote/ws",
        lastOpenedAt: "2026-06-15T10:00:00.000Z",
      },
      {
        id: "b",
        server: "local",
        workspacePath: "/local/ws",
        lastOpenedAt: "2026-06-15T09:00:00.000Z",
      },
    ]);
    expect(sessionsForServer(readWorkSessions("studio"), "local")).toHaveLength(1);
    expect(currentServerKey("studio")).toBe("local");
  });

  it("removeWorkSession deletes by id", () => {
    const session = touchWorkSession("aligner", {
      server: "local",
      workspacePath: "/data/ws-a",
    });
    removeWorkSession("aligner", session.id);
    expect(readWorkSessions("aligner")).toEqual([]);
  });

  it("migrates legacy aligner session storage into local history", () => {
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
  });
});
