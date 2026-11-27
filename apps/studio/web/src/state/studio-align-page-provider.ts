import type { AlignGridPatternCoord } from "@lisca/contracts";
import { mergeAlignGridEdgeExclusion } from "@lisca/client/align-session";
import { createAlignCanvasPointerHandlers, createCanvasTransientStatus } from "@lisca/instrument";
import { createVarExcludeController } from "@lisca/smart/var-exclude";

import {
  disposeStudioAlignPageController,
  getStudioAlignPageController,
  registerStudioAlignPageController,
  type StudioAlignPageContextValue,
  type StudioAlignPageController,
} from "./studio-align-page-context";
import { createStudioVarExcludeProvider } from "./studio-var-exclude";
import { createStudioAlignController } from "./use-studio-align-state";

export function createStudioAlignPageController(options?: {
  readonly onNavigate?: ((to: string) => void) | undefined;
}): StudioAlignPageController {
  let disposed = false;
  let navigateFn: (to: string) => void = options?.onNavigate ?? (() => {});
  let lastRawStatus: string | null = null;

  const listeners = new Set<() => void>();
  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const alignController = createStudioAlignController({
    onNavigate: (to) => navigateFn(to),
  });

  const initial = alignController.getState();

  const varExclude = createVarExcludeController({
    provider: createStudioVarExcludeProvider(),
    initialContext: {
      frame: initial.frame,
      grid: initial.effectiveGrid,
      currentExcludedPatterns: initial.currentExcludedPatterns,
      enabled: Boolean(initial.frame) && !initial.saving,
    },
    onPreview: (preview) => alignController.getState().showVariationExcludePreview(preview),
    onStatus: (status) => alignController.getState().reportStatus(status),
    onError: (error) => alignController.getState().reportError(error),
  });

  const transientStatus = createCanvasTransientStatus({
    initialStatus: initial.status,
  });
  lastRawStatus = initial.status;

  const pointer = createAlignCanvasPointerHandlers(() => {
    const state = alignController.getState();
    return {
      grid: state.effectiveGrid,
      onCommit: state.commitCanvas,
      toolMode: state.toolMode,
      spacingZoomLocked: state.spacingZoomLocked,
      patternZoomLocked: state.patternZoomLocked,
      manualExclusionEnabled: state.manualExclusionEnabled,
      excludedPatterns: state.currentExcludedPatterns,
      frame: state.frame,
      onExcludedPatternsChange: (patterns: AlignGridPatternCoord[]) =>
        state.setExcludedPatternsForCurrentPosition(patterns),
    };
  });

  const syncAuxiliary = () => {
    const state = alignController.getState();
    varExclude.sync({
      frame: state.frame,
      grid: state.effectiveGrid,
      currentExcludedPatterns: state.currentExcludedPatterns,
      enabled: Boolean(state.frame) && !state.saving,
    });
    if (state.status !== lastRawStatus) {
      lastRawStatus = state.status;
      transientStatus.setStatus(state.status);
    }
  };

  const unsubscribeAlign = alignController.subscribe(() => {
    syncAuxiliary();
    notify();
  });
  const unsubscribeVarExclude = varExclude.subscribe(notify);
  const unsubscribeStatus = transientStatus.subscribe(() => notify());

  /** Selection var exclude: additive on current exclusions, plus edge patterns once applied. */
  const requestVarExclude = async (): Promise<void> => {
    syncAuxiliary();
    await varExclude.requestPreview();
  };

  const applyExcludePreview = () => {
    const state = alignController.getState();
    const preview = state.variationExcludePreview;
    if (!preview) return;
    state.applyVariationExclude();
    const afterApply = alignController.getState();
    const frame = afterApply.frame;
    if (!frame) return;
    afterApply.setExcludedPatternsForCurrentPosition(
      mergeAlignGridEdgeExclusion(
        afterApply.currentExcludedPatterns,
        frame,
        afterApply.effectiveGrid,
      ),
    );
  };

  const cancelExcludePreview = () => {
    alignController.getState().cancelVariationExclude();
  };

  const getContext = (): StudioAlignPageContextValue => ({
    state: alignController.getState(),
    varExclude,
    pointer,
    visibleStatus: transientStatus.getVisibleStatus(),
    excludeActive: () => varExclude.isActive(),
    requestVarExclude,
    applyExcludePreview,
    cancelExcludePreview,
  });

  return {
    getContext,
    getState: () => alignController.getState(),
    setNavigate(navigate) {
      navigateFn = navigate;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      const state = alignController.getState();
      state.setManualExclusionEnabled(false);
      state.cancelVariationExclude();
      unsubscribeAlign();
      unsubscribeVarExclude();
      unsubscribeStatus();
      varExclude.dispose();
      transientStatus.dispose();
      alignController.dispose();
      listeners.clear();
    },
  };
}

let nextAlignInstanceSeq = 0;

export function nextStudioAlignInstanceId(): string {
  nextAlignInstanceSeq += 1;
  return `studio-align-${nextAlignInstanceSeq}`;
}

export function getOrCreateStudioAlignPageController(
  instanceId: string,
): StudioAlignPageController {
  return (
    getStudioAlignPageController(instanceId) ??
    registerStudioAlignPageController(instanceId, createStudioAlignPageController())
  );
}

export { disposeStudioAlignPageController };
