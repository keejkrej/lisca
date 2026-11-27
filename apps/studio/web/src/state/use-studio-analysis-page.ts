import type { AnalysisProgress, StudioAnalysisCsvFile } from "@lisca/contracts";
import { resultData } from "@lisca/client/atoms";
import type { StateUpdater } from "@lisca/client/atoms/annotator-ui";
import type { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";

import { analysisResultsAtom, analysisResultsIdleAtom } from "../atoms/studio-analysis-atoms";
import { shouldAdoptCachedAnalysisProgress, studioAnalysisRunActive } from "./studio-analysis-run";
import {
  studioAnnotateUiActions,
  studioAnnotateUiAtom,
  type StudioAnnotateStoreState,
} from "./studio-annotate-store";
import { studioRegistry } from "./studio-registry";
import { studioWizardAtom } from "./studio-store";

export type StudioAnalysisPage = {
  readonly workspacePath: string | null;
  readonly analysisResultFiles: StudioAnalysisCsvFile[];
  readonly setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  readonly setAnalysisResultFiles: (files: StudioAnalysisCsvFile[]) => void;
};

export type StudioAnalysisPageController = {
  readonly getState: () => StudioAnalysisPage;
  readonly subscribe: (listener: () => void) => () => void;
  readonly dispose: () => void;
};

export function createStudioAnalysisPageController(
  registry: AtomRegistry.AtomRegistry = studioRegistry,
): StudioAnalysisPageController {
  let disposed = false;
  let reconciling = false;
  let subscribedAtom: Atom.Atom<AsyncResult.AsyncResult<AnalysisProgress | null, unknown>> | null =
    null;
  let unsubscribeQuery: (() => void) | null = null;
  let currentQueryResult: AsyncResult.AsyncResult<AnalysisProgress | null, unknown> =
    registry.get(analysisResultsIdleAtom);

  const listeners = new Set<() => void>();
  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const setUi = (update: StateUpdater<StudioAnnotateStoreState>) => {
    const current = registry.get(studioAnnotateUiAtom);
    const next = typeof update === "function" ? update(current) : update;
    if (next !== current) {
      registry.set(studioAnnotateUiAtom, next);
    }
  };

  const setAnalysisProgress = (progress: AnalysisProgress | null) =>
    studioAnnotateUiActions.setAnalysisProgress(setUi, progress);
  const setAnalysisResultFiles = (files: StudioAnalysisCsvFile[]) =>
    studioAnnotateUiActions.setAnalysisResultFiles(setUi, files);

  const resolvedWorkspacePath = (): string | null => {
    const annotateUi = registry.get(studioAnnotateUiAtom);
    const wizard = registry.get(studioWizardAtom);
    return annotateUi.workspacePath?.trim() || wizard.workspacePath.trim() || null;
  };

  const bindQuerySubscription = () => {
    const annotateUi = registry.get(studioAnnotateUiAtom);
    const hasStoredResultFiles = annotateUi.analysisResultFiles.length > 0;
    const path = resolvedWorkspacePath();
    const targetAtom =
      !hasStoredResultFiles && path ? analysisResultsAtom(path) : analysisResultsIdleAtom;
    if (targetAtom === subscribedAtom && unsubscribeQuery) return;
    unsubscribeQuery?.();
    subscribedAtom = targetAtom;
    currentQueryResult = registry.get(targetAtom);
    unsubscribeQuery = registry.subscribe(targetAtom, (next) => {
      currentQueryResult = next;
      reconcile();
    });
  };

  const reconcile = () => {
    if (disposed || reconciling) return;
    reconciling = true;
    try {
      bindQuerySubscription();

      const annotateUi = registry.get(studioAnnotateUiAtom);
      const hasStoredResultFiles = annotateUi.analysisResultFiles.length > 0;
      const liveStatus = annotateUi.analysisProgress?.status ?? null;
      if (
        shouldAdoptCachedAnalysisProgress({
          hasStoredResultFiles,
          runActive: studioAnalysisRunActive(),
          liveStatus,
        })
      ) {
        const results = resultData(currentQueryResult);
        if (results) {
          setAnalysisProgress(results);
          if (results.resultFiles && results.resultFiles.length > 0) {
            setAnalysisResultFiles(results.resultFiles);
          }
        }
      }
    } finally {
      reconciling = false;
    }
    notify();
  };

  const unsubscribeWizard = registry.subscribe(studioWizardAtom, () => reconcile());
  const unsubscribeAnnotate = registry.subscribe(studioAnnotateUiAtom, () => reconcile());

  reconcile();

  return {
    getState: () => ({
      workspacePath: resolvedWorkspacePath(),
      analysisResultFiles: registry.get(studioAnnotateUiAtom).analysisResultFiles,
      setAnalysisProgress,
      setAnalysisResultFiles,
    }),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      unsubscribeQuery?.();
      unsubscribeWizard();
      unsubscribeAnnotate();
      listeners.clear();
    },
  };
}
