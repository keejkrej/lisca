import { useAtom } from "@effect/atom-solid";
import { AssayJsonFileSchema, decodeJsonResult } from "@lisca/contracts";
import type { AssayType } from "@lisca/contracts";
import { alignSnapshotKey } from "@lisca/client/align-session";
import { runClientEffect } from "@lisca/client/runtime";
import {
  defaultStudioAlignTime,
  studioAlignFrameDefault,
  toStudioSource,
} from "@lisca/client/studio/source";
import {
  useAlignStateCore,
  type AlignState as CoreAlignState,
  type CropConfirmState,
  type VariationExcludePreview,
} from "@lisca/client/use-align-state-core";
import { useCanvasResourceTransaction } from "@lisca/instrument";
import { useShellWorkspace } from "@lisca/ui/shell";
import * as Result from "effect/Result";
import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from "solid-js";

import { alignerClient, toErrorMessage } from "../api/aligner-port";
import { scanIdleAtom, scanSourceAtom } from "../atoms/aligner-query-atoms";
import { alignerUiActions, alignerUiAtom } from "../atoms/aligner-ui-atoms";
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

function workspaceAssayJsonPath(workspacePath: string): string {
  return `${workspacePath.trim().replace(/[/\\]+$/, "")}/assay.json`;
}

export function useAlignState(): Accessor<AlignState> {
  const workspace = useShellWorkspace();
  const [ui, setUi] = useAtom(() => alignerUiAtom);
  const [assayType, setAssayType] = createSignal<AssayType | null>(null);
  const [savedPositions, setSavedPositions] = createSignal<Set<number>>(new Set());
  const [baselineByPos, setBaselineByPos] = createSignal<Map<number, string>>(new Map());

  const core = useAlignStateCore({
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
    host: {
      useWorkspace: useShellWorkspace,
      useCanvasTransaction: useCanvasResourceTransaction,
    },
    // Light shell: bbox/align only. Crop is Studio / lisca-crop / notebooks zip.
    enableCrop: false,
    assayDefaultTime: () => {
      const type = assayType();
      if (type == null) return null;
      return defaultStudioAlignTime(ui().scan?.times, studioAlignFrameDefault(type));
    },
  });

  const refreshSavedPositions = async (path: string) => {
    try {
      const list = await runClientEffect(alignerClient.listSavedBboxPositions(path));
      setSavedPositions(new Set<number>(list));
    } catch {
      setSavedPositions(new Set<number>());
    }
  };

  const syncPositionBaseline = async (path: string, pos: number) => {
    try {
      const saved = await runClientEffect(alignerClient.loadAlignState(path, pos));
      if (!saved) return;
      const key = alignSnapshotKey(saved.grid, saved.excludedPatterns ?? [], saved.drift ?? null);
      setBaselineByPos((prev) => {
        const next = new Map(prev);
        next.set(pos, key);
        return next;
      });
    } catch {
      // Ignore missing or unreadable saved state.
    }
  };

  createEffect(() => {
    const path = workspace.workspacePath?.trim() ?? "";
    if (!path) {
      setAssayType(null);
      setSavedPositions(new Set<number>());
      setBaselineByPos(new Map<number, string>());
      return;
    }
    void refreshSavedPositions(path);
    const assayPath = workspaceAssayJsonPath(path);
    let cancelled = false;
    void runClientEffect(alignerClient.readTextFile(assayPath))
      .then((contents) => {
        if (cancelled) return;
        const decoded = decodeJsonResult(AssayJsonFileSchema)(contents);
        if (!Result.isSuccess(decoded)) {
          setAssayType(null);
          return;
        }
        const assay = decoded.success;
        setAssayType(assay.type);
        if (ui().source == null) {
          const autoSource = toStudioSource({
            kind: assay.data.type,
            dataPath: assay.data.path,
            folderTemplate:
              assay.data.type === "folder"
                ? {
                    subfolder: assay.data.template.subfolder,
                    filename: assay.data.template.filename,
                  }
                : undefined,
          });
          if (autoSource) {
            workspace.setSourcePath(autoSource.path);
            core().setSource(autoSource);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setAssayType(null);
      });
    onCleanup(() => {
      cancelled = true;
    });
  });

  createEffect(() => {
    const path = workspace.workspacePath?.trim() ?? "";
    const pos = core().selection.pos;
    if (!path) return;
    void syncPositionBaseline(path, pos);
  });

  const currentSnapshotKey = createMemo(() => {
    const current = core();
    return alignSnapshotKey(current.grid, current.currentExcludedPatterns, current.drift);
  });

  const positionSaveState = createMemo<AlignPositionSaveState>(() => {
    const pos = core().selection.pos;
    const isSaved = savedPositions().has(pos);
    const baseline = baselineByPos().get(pos);
    if (!isSaved) return "unsaved";
    if (baseline && baseline !== currentSnapshotKey()) return "changed";
    return "saved";
  });

  const saveCurrent = async (): Promise<boolean> => {
    const current = core();
    const pos = current.selection.pos;
    const snap = alignSnapshotKey(current.grid, current.currentExcludedPatterns, current.drift);
    const ok = await current.saveCurrent();
    if (ok) {
      setSavedPositions((prev) => {
        const next = new Set(prev);
        next.add(pos);
        return next;
      });
      setBaselineByPos((prev) => {
        const next = new Map(prev);
        next.set(pos, snap);
        return next;
      });
    }
    return ok;
  };

  const changePosition = (pos: number) => {
    const current = core();
    if (pos === current.selection.pos) return;
    if (
      positionSaveState() === "changed" &&
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
    if (workspace.workspacePath?.trim() !== trimmed) {
      workspace.setWorkspacePath(trimmed);
      core().setSource(null);
      return;
    }
    await refreshSavedPositions(trimmed);
    const pos = core().selection.pos;
    try {
      const saved = await runClientEffect(alignerClient.loadAlignState(trimmed, pos));
      if (saved) {
        alignerUiActions.applySavedAlignState?.(
          setUi,
          `${trimmed}:pos:${pos}:agent:${Date.now()}`,
          pos,
          saved,
        );
        const snap = alignSnapshotKey(
          saved.grid,
          saved.excludedPatterns ?? [],
          saved.drift ?? null,
        );
        setBaselineByPos((prev) => {
          const next = new Map(prev);
          next.set(pos, snap);
          return next;
        });
      }
    } catch {
      // Ignore transient read failure while agent writes.
    }
  };

  return createMemo<AlignState>(() => {
    const base = core();
    const positions = base.scan?.positions ?? [];
    const idx = positions.indexOf(base.selection.pos);
    const canGoBack = idx > 0;
    const canGoNext = idx >= 0 && idx < positions.length - 1;

    return {
      ...base,
      saveCurrent,
      positionSaveState: positionSaveState(),
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
  });
}
