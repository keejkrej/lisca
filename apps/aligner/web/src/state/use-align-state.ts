import { alignSnapshotKey } from "@lisca/client/align-session";
import {
  createAlignSessionController,
  type AlignState as CoreAlignState,
  type CropConfirmState,
  type StateUpdater,
  type VariationExcludePreview,
} from "@lisca/client/align-session/controller";
import { runClientEffect } from "@lisca/client/runtime";
import {
  defaultStudioAlignTime,
  studioAlignFrameDefault,
  toStudioSource,
} from "@lisca/client/studio/source";
import { AssayJsonFileSchema, decodeJsonResult, type AssayType } from "@lisca/contracts";
import * as Result from "effect/Result";

import { alignerClient, toErrorMessage } from "../api/aligner-port";
import { scanIdleAtom, scanSourceAtom } from "../atoms/aligner-query-atoms";
import { alignerRegistry } from "../atoms/aligner-registry";
import { alignerUiActions, alignerUiAtom, type AlignerUiState } from "../atoms/aligner-ui-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";

export type AlignPositionSaveState = "saved" | "unsaved" | "changed";

export type AlignState = CoreAlignState & {
  positionSaveState: AlignPositionSaveState;
  canGoBack: boolean;
  canGoNext: boolean;
  changePosition: (pos: number) => void;
  goBack: () => void;
  goNext: () => void;
  refreshAgentWorkspace: (workspacePath: string) => Promise<void>;
};

export type { CropConfirmState, VariationExcludePreview };
export type { ExcludedByPosition } from "../atoms/aligner-ui-atoms";

export type ShellWorkspaceSyncEvent =
  | { readonly kind: "workspace"; readonly path: string | null }
  | { readonly kind: "source"; readonly path: string | null };

export type AlignerControllerOptions = {
  readonly initialWorkspacePath: string | null;
  readonly initialSourcePath: string | null;
};

export type AlignerController = {
  getState: () => AlignState;
  subscribe: (listener: () => void) => () => void;
  subscribeShellSync: (listener: (event: ShellWorkspaceSyncEvent) => void) => () => void;
  syncShellWorkspace: (workspacePath: string | null, sourcePath: string | null) => void;
  dispose: () => void;
};

function workspaceAssayJsonPath(workspacePath: string): string {
  return `${workspacePath.trim().replace(/[/\\]+$/, "")}/assay.json`;
}

export function createAlignerController(options: AlignerControllerOptions): AlignerController {
  let shellWorkspacePath: string | null = options.initialWorkspacePath;
  let shellSourcePath: string | null = options.initialSourcePath;
  let assayType: AssayType | null = null;
  let savedPositions = new Set<number>();
  let baselineByPos = new Map<number, string>();
  let lastObservedWorkspacePath: string | null = null;
  let lastObservedBaselineKey: string | null = null;
  let workspaceGeneration = 0;
  let disposed = false;

  const listeners = new Set<() => void>();
  const shellSyncListeners = new Set<(event: ShellWorkspaceSyncEvent) => void>();
  const pendingShellSync: ShellWorkspaceSyncEvent[] = [];

  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const emitShellSync = (event: ShellWorkspaceSyncEvent) => {
    if (disposed) return;
    if (shellSyncListeners.size === 0) {
      pendingShellSync.push(event);
      return;
    }
    for (const listener of shellSyncListeners) listener(event);
  };

  const setShellWorkspacePath = (path: string | null) => {
    if (shellWorkspacePath === path) return;
    shellWorkspacePath = path;
    if (path === null) {
      shellSourcePath = null;
    }
    emitShellSync({ kind: "workspace", path });
  };

  const setShellSourcePath = (path: string | null) => {
    const effectivePath = shellWorkspacePath ? path : null;
    if (shellSourcePath === effectivePath) return;
    shellSourcePath = effectivePath;
    emitShellSync({ kind: "source", path: effectivePath });
  };

  const setUi = (update: StateUpdater<AlignerUiState>) => {
    const current = alignerRegistry.get(alignerUiAtom);
    const next = typeof update === "function" ? update(current) : update;
    if (next !== current) {
      alignerRegistry.set(alignerUiAtom, next);
    }
  };

  const core = createAlignSessionController({
    registry: alignerRegistry,
    store: {
      atom: alignerUiAtom,
      actions: alignerUiActions,
    },
    backend: {
      client: alignerClient,
      loadFrame: loadFrameEffect,
      toErrorMessage,
      frameErrorMessage: effectErrorMessage,
    },
    scan: {
      forSource: scanSourceAtom,
      idle: scanIdleAtom,
    },
    workspace: {
      getWorkspacePath: () => shellWorkspacePath,
      setWorkspacePath: setShellWorkspacePath,
      getSourcePath: () => shellSourcePath,
      setSourcePath: setShellSourcePath,
    },
    policy: {
      // Light shell: bbox/align only. Crop is Studio / lisca-crop / notebooks zip.
      enableCrop: false,
    },
    assayDefaultTime: () => {
      if (assayType == null) return null;
      return defaultStudioAlignTime(
        alignerRegistry.get(alignerUiAtom).scan?.times,
        studioAlignFrameDefault(assayType),
      );
    },
  });

  const refreshSavedPositions = async (path: string, generation: number) => {
    try {
      const list = await runClientEffect(alignerClient.listSavedBboxPositions(path));
      if (disposed || generation !== workspaceGeneration) return;
      savedPositions = new Set<number>(list);
      notify();
    } catch {
      if (disposed || generation !== workspaceGeneration) return;
      savedPositions = new Set<number>();
      notify();
    }
  };

  const syncPositionBaseline = async (path: string, pos: number, generation: number) => {
    try {
      const saved = await runClientEffect(alignerClient.loadAlignState(path, pos));
      if (disposed || generation !== workspaceGeneration || !saved) return;
      const key = alignSnapshotKey(saved.grid, saved.excludedPatterns ?? [], saved.drift ?? null);
      const next = new Map(baselineByPos);
      next.set(pos, key);
      baselineByPos = next;
      notify();
    } catch {
      // Ignore missing or unreadable saved state.
    }
  };

  const loadWorkspaceAssay = (path: string, generation: number) => {
    const assayPath = workspaceAssayJsonPath(path);
    void runClientEffect(alignerClient.readTextFile(assayPath))
      .then((contents) => {
        if (disposed || generation !== workspaceGeneration) return;
        const decoded = decodeJsonResult(AssayJsonFileSchema)(contents);
        if (!Result.isSuccess(decoded)) {
          assayType = null;
          notify();
          return;
        }
        const assay = decoded.success;
        assayType = assay.type;
        if (alignerRegistry.get(alignerUiAtom).source == null) {
          const autoSource = toStudioSource({
            kind: assay.data.type,
            dataPath: assay.data.path,
            ...(assay.data.type === "folder"
              ? {
                  folderTemplate: {
                    subfolder: assay.data.template.subfolder,
                    filename: assay.data.template.filename,
                  },
                }
              : {}),
          });
          if (autoSource) {
            setShellSourcePath(autoSource.path);
            core.getState().setSource(autoSource);
          }
        }
        notify();
      })
      .catch(() => {
        if (disposed || generation !== workspaceGeneration) return;
        assayType = null;
        notify();
      });
  };

  const syncSideEffects = () => {
    if (disposed) return;
    const base = core.getState();
    const path = (shellWorkspacePath ?? base.workspacePath)?.trim() ?? "";

    if (path !== lastObservedWorkspacePath) {
      workspaceGeneration += 1;
      const generation = workspaceGeneration;
      lastObservedWorkspacePath = path;
      lastObservedBaselineKey = null;

      if (!path) {
        assayType = null;
        savedPositions = new Set<number>();
        baselineByPos = new Map<number, string>();
      } else {
        void refreshSavedPositions(path, generation);
        loadWorkspaceAssay(path, generation);
      }
    }

    const baselineKey = path ? `${path}:${base.selection.pos}` : null;
    if (baselineKey !== lastObservedBaselineKey) {
      lastObservedBaselineKey = baselineKey;
      if (path) {
        void syncPositionBaseline(path, base.selection.pos, workspaceGeneration);
      }
    }
  };

  const computePositionSaveState = (base: CoreAlignState): AlignPositionSaveState => {
    const pos = base.selection.pos;
    const isSaved = savedPositions.has(pos);
    if (!isSaved) return "unsaved";
    const baseline = baselineByPos.get(pos);
    const currentSnapshotKey = alignSnapshotKey(
      base.grid,
      base.currentExcludedPatterns,
      base.drift,
    );
    if (baseline && baseline !== currentSnapshotKey) return "changed";
    return "saved";
  };

  const saveCurrent = async (): Promise<boolean> => {
    const current = core.getState();
    const pos = current.selection.pos;
    const snap = alignSnapshotKey(current.grid, current.currentExcludedPatterns, current.drift);
    const ok = await current.saveCurrent();
    if (ok && !disposed) {
      const nextSaved = new Set(savedPositions);
      nextSaved.add(pos);
      savedPositions = nextSaved;
      const nextBaseline = new Map(baselineByPos);
      nextBaseline.set(pos, snap);
      baselineByPos = nextBaseline;
      notify();
    }
    return ok;
  };

  const changePosition = (pos: number) => {
    const current = core.getState();
    if (pos === current.selection.pos) return;
    if (
      computePositionSaveState(current) === "changed" &&
      typeof window !== "undefined" &&
      !window.confirm("Discard unsaved alignment changes for this position?")
    ) {
      return;
    }
    current.setSelection({ pos });
  };

  const refreshAgentWorkspace = async (agentWorkspacePath: string) => {
    const trimmed = agentWorkspacePath.trim();
    if (!trimmed) return;
    if ((shellWorkspacePath?.trim() ?? "") !== trimmed) {
      setShellWorkspacePath(trimmed);
      core.getState().setSource(null);
      core.syncExternal();
      return;
    }
    const generation = workspaceGeneration;
    await refreshSavedPositions(trimmed, generation);
    if (disposed) return;
    const pos = core.getState().selection.pos;
    try {
      const saved = await runClientEffect(alignerClient.loadAlignState(trimmed, pos));
      if (disposed || !saved) return;
      alignerUiActions.applySavedAlignState?.(
        setUi,
        `${trimmed}:pos:${pos}:agent:${Date.now()}`,
        pos,
        saved,
      );
      const snap = alignSnapshotKey(saved.grid, saved.excludedPatterns ?? [], saved.drift ?? null);
      const nextBaseline = new Map(baselineByPos);
      nextBaseline.set(pos, snap);
      baselineByPos = nextBaseline;
      notify();
    } catch {
      // Ignore transient read failure while agent writes.
    }
  };

  const unsubscribeCore = core.subscribe(() => {
    syncSideEffects();
    notify();
  });

  // Trigger initial workspace/baseline effects for hydrated state.
  syncSideEffects();

  const getState = (): AlignState => {
    const base = core.getState();
    const positions = base.scan?.positions ?? [];
    const idx = positions.indexOf(base.selection.pos);
    const canGoBack = idx > 0;
    const canGoNext = idx >= 0 && idx < positions.length - 1;

    return {
      ...base,
      saveCurrent,
      positionSaveState: computePositionSaveState(base),
      canGoBack,
      canGoNext,
      changePosition,
      goBack: () => {
        if (idx > 0) changePosition(positions[idx - 1]!);
      },
      goNext: () => {
        if (idx >= 0 && idx < positions.length - 1) changePosition(positions[idx + 1]!);
      },
      refreshAgentWorkspace,
    };
  };

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeShellSync(listener) {
      shellSyncListeners.add(listener);
      if (pendingShellSync.length > 0) {
        const queued = pendingShellSync.splice(0, pendingShellSync.length);
        for (const event of queued) {
          listener(event);
        }
      }
      return () => {
        shellSyncListeners.delete(listener);
      };
    },
    syncShellWorkspace(workspacePath, sourcePath) {
      if (disposed) return;
      const changed = shellWorkspacePath !== workspacePath || shellSourcePath !== sourcePath;
      shellWorkspacePath = workspacePath;
      shellSourcePath = sourcePath;
      if (changed) {
        core.syncExternal();
      }
    },
    dispose() {
      disposed = true;
      workspaceGeneration += 1;
      unsubscribeCore();
      core.dispose();
      listeners.clear();
      shellSyncListeners.clear();
      pendingShellSync.length = 0;
    },
  };
}
