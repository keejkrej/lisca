import type { AlignerSource, MemoryKind } from "@lisca/contracts";

import {
  readRecentMemory,
  touchRecentMemory,
  type RecentMemoryTouch,
} from "../session/recent-memory";

export type StudioWizardMemoryTouch = RecentMemoryTouch;

export function touchStudioWizardMemory(touch: StudioWizardMemoryTouch): void {
  touchRecentMemory("studio", touch);
}

export function readStudioWizardMemoryRecent(kind: MemoryKind): {
  workspaces: Array<{ path: string; label?: string }>;
  sources: Array<{ source: AlignerSource; label?: string }>;
  assays: Array<{ path: string; assayLabel?: string; workspacePath?: string }>;
} {
  const memory = readRecentMemory("studio");

  if (kind === "workspace") {
    return {
      workspaces: memory.workspaces.map(({ path, label }) => ({ path, label })),
      sources: [],
      assays: [],
    };
  }
  if (kind === "source") {
    return {
      workspaces: [],
      sources: memory.sources.map(({ source, label }) => ({ source, label })),
      assays: [],
    };
  }
  return {
    workspaces: [],
    sources: [],
    assays: memory.assays.map(({ path, assayLabel, workspacePath }) => ({
      path,
      assayLabel,
      workspacePath,
    })),
  };
}
