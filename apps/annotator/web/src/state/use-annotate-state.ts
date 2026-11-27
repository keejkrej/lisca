import type { RoiWorkspaceScan } from "@lisca/contracts";
import {
  clearRoiFrameCache,
  createAnnotateSessionController,
  type AnnotateState as CoreAnnotateState,
  type AnnotateWorkspaceSync,
} from "@lisca/client/annotate-session/controller";
import type { Atom, AtomRegistry } from "effect/reactivity";

import { annotatorClient, toErrorMessage } from "../api/annotator-port";
import {
  annotationLabelsAtom,
  invalidateAnnotatorWorkspaceAtom,
  labelsIdleAtom,
  roiScanIdleAtom,
  roiWorkspaceScanAtom,
  saveAnnotationLabelsAtom,
  saveRoiFrameAnnotationAtom,
} from "../atoms/annotator-query-atoms";
import { annotatorUiActions, annotatorUiAtom } from "../atoms/annotator-ui-atoms";

export type { CoreAnnotateState };

export type AnnotateState = CoreAnnotateState & {
  canGoBack: boolean;
  canGoNext: boolean;
  goBack: () => void;
  goNext: () => void;
  refreshAgentWorkspace: (workspacePath: string) => Promise<void>;
};

export type AnnotateStateController = {
  getState: () => AnnotateState;
  subscribe: (listener: () => void) => () => void;
  syncExternal: () => void;
  dispose: () => void;
};

export type AnnotateStateControllerOptions = {
  registry: AtomRegistry.AtomRegistry;
  workspace: AnnotateWorkspaceSync;
};

function buildSites(scan: RoiWorkspaceScan | null): Array<{ pos: number; roi: number }> {
  if (!scan) return [];
  const list: Array<{ pos: number; roi: number }> = [];
  for (const position of scan.positions) {
    for (const roiEntry of position.rois) {
      list.push({ pos: position.pos, roi: roiEntry.roi });
    }
  }
  return list;
}

function runAtomFn<Arg, Value>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.AtomResultFn<Arg, Value, unknown>,
  arg: Arg,
): Promise<Value> {
  return new Promise<Value>((resolve, reject) => {
    let settled = false;
    const unsub = registry.subscribe(atom, (result) => {
      if (settled || result._tag === "Initial" || result.waiting) return;
      settled = true;
      unsub();
      if (result._tag === "Success") {
        resolve(result.value);
      } else {
        reject(result.cause);
      }
    });
    registry.set(atom, arg);
  });
}

export function createAnnotateStateController(
  options: AnnotateStateControllerOptions,
): AnnotateStateController {
  const { registry, workspace } = options;

  const core = createAnnotateSessionController({
    registry,
    annotatorClient,
    toErrorMessage,
    annotatorUiAtom,
    annotatorUiActions,
    roiWorkspaceScanAtom,
    roiScanIdleAtom,
    annotationLabelsAtom,
    labelsIdleAtom,
    saveAnnotationLabelsAtom,
    saveRoiFrameAnnotationAtom,
    workspace,
    guardDirtySelection: (dirty, selectionChanging) => {
      if (!dirty || selectionChanging) return true;
      return typeof window === "undefined"
        ? true
        : window.confirm("Discard unsaved annotation changes?");
    },
  });

  const refreshAgentWorkspace = async (agentWorkspacePath: string) => {
    const trimmed = agentWorkspacePath.trim();
    if (!trimmed) return;
    const currentState = core.getState();
    if ((currentState.workspacePath?.trim() ?? "") !== trimmed) {
      currentState.pickWorkspace(trimmed);
      return;
    }
    clearRoiFrameCache();
    await runAtomFn(registry, invalidateAnnotatorWorkspaceAtom, trimmed);
    const nextState = core.getState();
    nextState.setSelection({ ...nextState.selection });
    core.syncExternal();
  };

  const goBack = () => {
    const current = core.getState();
    const list = buildSites(current.scan);
    const index = list.findIndex(
      (site) => site.pos === current.selection.pos && site.roi === current.selection.roi,
    );
    if (index <= 0) return;
    const target = list[index - 1]!;
    current.changeSelection(() => current.setSelection({ pos: target.pos, roi: target.roi }));
  };

  const goNext = () => {
    const current = core.getState();
    const list = buildSites(current.scan);
    const index = list.findIndex(
      (site) => site.pos === current.selection.pos && site.roi === current.selection.roi,
    );
    if (index < 0 || index >= list.length - 1) return;
    const target = list[index + 1]!;
    current.changeSelection(() => current.setSelection({ pos: target.pos, roi: target.roi }));
  };

  const getState = (): AnnotateState => {
    const base = core.getState();
    const list = buildSites(base.scan);
    const index = list.findIndex(
      (site) => site.pos === base.selection.pos && site.roi === base.selection.roi,
    );
    return {
      ...base,
      canGoBack: index > 0,
      canGoNext: index >= 0 && index < list.length - 1,
      goBack,
      goNext,
      refreshAgentWorkspace,
    };
  };

  return {
    getState,
    subscribe: core.subscribe,
    syncExternal: core.syncExternal,
    dispose: core.dispose,
  };
}
