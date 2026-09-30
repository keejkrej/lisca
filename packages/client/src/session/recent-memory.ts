import type {
  AlignerSource,
  MemoryAssayEntry,
  MemorySourceEntry,
  MemoryWorkspaceEntry,
} from "@lisca/contracts";
import {
  liscaLocalStorage,
  readStorageJson,
  writeStorageJson,
  type LiscaAppId,
} from "@lisca/utils";

import { readWorkSessions } from "./work-session";

/**
 * Per-app recent picks, one list per picker: assays (Studio), workspaces, and sources.
 * Picking a recent item sets only that field.
 */
export type RecentMemory = {
  workspaces: MemoryWorkspaceEntry[];
  sources: MemorySourceEntry[];
  assays: MemoryAssayEntry[];
};

export type RecentMemoryTouch =
  | { kind: "workspace"; path: string; label?: string }
  | { kind: "source"; source: AlignerSource; label?: string }
  | { kind: "assay"; path: string; assayLabel?: string; workspacePath?: string };

const MEMORY_CAP = 20;

function recentMemoryKey(appId: LiscaAppId): string {
  // Studio keeps its original key so existing history survives.
  return appId === "studio" ? "lisca.studio.wizardMemory" : `lisca.${appId}.recentMemory`;
}

function emptyMemory(): RecentMemory {
  return { workspaces: [], sources: [], assays: [] };
}

/** First read for Aligner/Annotator: seed from the saved sessions the resume dialog used. */
function seedFromWorkSessions(appId: LiscaAppId): RecentMemory {
  const memory = emptyMemory();
  if (appId === "studio") return memory;
  const sessions = [...readWorkSessions(appId)].sort(
    (a, b) => Date.parse(b.lastOpenedAt) - Date.parse(a.lastOpenedAt),
  );
  for (const session of sessions) {
    const lastUsedAt = Date.parse(session.lastOpenedAt) || 0;
    const path = session.workspacePath?.trim();
    if (path && !memory.workspaces.some((entry) => entry.path === path)) {
      memory.workspaces.push({ path, label: session.label, lastUsedAt });
    }
    if (appId === "aligner" && session.source) {
      const source = session.source;
      if (!memory.sources.some((entry) => sourcesEqual(entry.source, source))) {
        memory.sources.push({ source, lastUsedAt });
      }
    }
  }
  return {
    workspaces: memory.workspaces.slice(0, MEMORY_CAP),
    sources: memory.sources.slice(0, MEMORY_CAP),
    assays: [],
  };
}

export function readRecentMemory(appId: LiscaAppId): RecentMemory {
  const stored = readStorageJson<Partial<RecentMemory>>(
    liscaLocalStorage(),
    recentMemoryKey(appId),
  );
  if (!stored) return seedFromWorkSessions(appId);
  return {
    workspaces: stored.workspaces ?? [],
    sources: stored.sources ?? [],
    assays: stored.assays ?? [],
  };
}

function sourcesEqual(a: AlignerSource, b: AlignerSource): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function touchRecentMemory(appId: LiscaAppId, touch: RecentMemoryTouch): void {
  const now = Date.now();
  const memory = readRecentMemory(appId);

  if (touch.kind === "workspace") {
    const path = touch.path.trim();
    if (!path) return;
    const prior = memory.workspaces.find((entry) => entry.path === path);
    memory.workspaces = [
      { path, label: touch.label ?? prior?.label, lastUsedAt: now },
      ...memory.workspaces.filter((entry) => entry.path !== path),
    ].slice(0, MEMORY_CAP);
  } else if (touch.kind === "source") {
    const prior = memory.sources.find((entry) => sourcesEqual(entry.source, touch.source));
    memory.sources = [
      { source: touch.source, label: touch.label ?? prior?.label, lastUsedAt: now },
      ...memory.sources.filter((entry) => !sourcesEqual(entry.source, touch.source)),
    ].slice(0, MEMORY_CAP);
  } else {
    const path = touch.path.trim();
    if (!path) return;
    memory.assays = [
      { path, assayLabel: touch.assayLabel, workspacePath: touch.workspacePath, lastUsedAt: now },
      ...memory.assays.filter((entry) => entry.path !== path),
    ].slice(0, MEMORY_CAP);
  }

  writeStorageJson(liscaLocalStorage(), recentMemoryKey(appId), memory);
}
