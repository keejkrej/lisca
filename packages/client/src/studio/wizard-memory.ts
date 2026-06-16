import type {
  AlignerSource,
  MemoryAssayEntry,
  MemoryKind,
  MemorySourceEntry,
  MemoryWorkspaceEntry,
} from "@lisca/contracts";
import { liscaLocalStorage, readStorageJson, writeStorageJson } from "@lisca/storage";

const WIZARD_MEMORY_KEY = "lisca.studio.wizardMemory";
const MEMORY_CAP = 20;

type StudioWizardMemoryFile = {
  workspaces: MemoryWorkspaceEntry[];
  sources: MemorySourceEntry[];
  assays: MemoryAssayEntry[];
};

function emptyMemory(): StudioWizardMemoryFile {
  return { workspaces: [], sources: [], assays: [] };
}

function readWizardMemory(): StudioWizardMemoryFile {
  return readStorageJson<StudioWizardMemoryFile>(liscaLocalStorage(), WIZARD_MEMORY_KEY) ?? emptyMemory();
}

function writeWizardMemory(memory: StudioWizardMemoryFile): void {
  writeStorageJson(liscaLocalStorage(), WIZARD_MEMORY_KEY, memory);
}

function trimCap<T>(entries: T[]): T[] {
  return entries.slice(0, MEMORY_CAP);
}

function sourcesEqual(a: AlignerSource, b: AlignerSource): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export type StudioWizardMemoryTouch =
  | { kind: "workspace"; path: string; label?: string }
  | { kind: "source"; source: AlignerSource; label?: string }
  | {
      kind: "assay";
      path: string;
      assayLabel?: string;
      workspacePath?: string;
    };

export function touchStudioWizardMemory(touch: StudioWizardMemoryTouch): void {
  const now = new Date().toISOString();
  const memory = readWizardMemory();

  if (touch.kind === "workspace") {
    const path = touch.path.trim();
    if (!path) return;
    memory.workspaces = trimCap([
      { path, label: touch.label, lastUsedAt: now },
      ...memory.workspaces.filter((entry) => entry.path !== path),
    ]);
  } else if (touch.kind === "source") {
    memory.sources = trimCap([
      { source: touch.source, label: touch.label, lastUsedAt: now },
      ...memory.sources.filter((entry) => !sourcesEqual(entry.source, touch.source)),
    ]);
  } else {
    const path = touch.path.trim();
    if (!path) return;
    memory.assays = trimCap([
      {
        path,
        assayLabel: touch.assayLabel,
        workspacePath: touch.workspacePath,
        lastUsedAt: now,
      },
      ...memory.assays.filter((entry) => entry.path !== path),
    ]);
  }

  writeWizardMemory(memory);
}

export function readStudioWizardMemoryRecent(kind: MemoryKind): {
  workspaces: Array<{ path: string; label?: string }>;
  sources: Array<{ source: AlignerSource; label?: string }>;
  assays: Array<{ path: string; assayLabel?: string; workspacePath?: string }>;
} {
  const memory = readWizardMemory();

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
