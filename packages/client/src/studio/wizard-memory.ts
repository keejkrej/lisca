import type { AlignerSource, MemoryKind } from "@lisca/contracts";
import type { HostFilePickerMode } from "@lisca/utils";

import {
  forgetRecentAssay,
  forgetRecentSource,
  forgetRecentWorkspace,
  readRecentMemory,
  touchRecentMemory,
  type RecentMemoryTouch,
} from "../session/recent-memory";

export type StudioWizardMemoryTouch = RecentMemoryTouch;

export function touchStudioWizardMemory(touch: StudioWizardMemoryTouch): void {
  touchRecentMemory("studio", touch);
}

export function forgetStudioAssay(path: string): void {
  forgetRecentAssay("studio", path);
}

export function forgetStudioWorkspace(path: string): void {
  forgetRecentWorkspace("studio", path);
}

export function forgetStudioSource(mode: HostFilePickerMode, path: string): void {
  forgetRecentSource("studio", mode, path);
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
