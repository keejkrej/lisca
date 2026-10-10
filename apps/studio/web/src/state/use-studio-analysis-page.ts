import type { AnalysisProgress, StudioAnalysisCsvFile } from "@lisca/contracts";
import { resultData, useSelectedAtomValue } from "@lisca/client/atoms";
import { createEffect } from "solid-js";

import { analysisResultsAtom, analysisResultsIdleAtom } from "../atoms/studio-analysis-atoms";
import { useStudioAnnotateStore } from "./studio-annotate-store";
import { shouldAdoptCachedAnalysisProgress, studioAnalysisRunActive } from "./studio-analysis-run";
import { useStudioStore } from "./studio-store";

export type StudioAnalysisPage = {
  workspacePath: string | null;
  analysisResultFiles: StudioAnalysisCsvFile[];
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setAnalysisResultFiles: (files: StudioAnalysisCsvFile[]) => void;
};

export function useStudioAnalysisPage(): StudioAnalysisPage {
  const workspacePath = useStudioStore((state) => state.workspacePath);
  const activeWorkspacePath = () => workspacePath().trim() || null;
  const annotateStore = useStudioAnnotateStore();
  const { setAnalysisProgress, setAnalysisResultFiles } = annotateStore;

  const resolvedWorkspacePath = () => annotateStore.workspacePath?.trim() || activeWorkspacePath();
  const hasStoredResultFiles = () => annotateStore.analysisResultFiles.length > 0;
  const resultsQueryResult = useSelectedAtomValue(() => {
    if (hasStoredResultFiles()) return analysisResultsIdleAtom;
    const path = resolvedWorkspacePath();
    return path ? analysisResultsAtom(path) : analysisResultsIdleAtom;
  });

  createEffect(() => {
    const liveStatus = annotateStore.analysisProgress?.status ?? null;
    if (
      !shouldAdoptCachedAnalysisProgress({
        hasStoredResultFiles: hasStoredResultFiles(),
        runActive: studioAnalysisRunActive(),
        liveStatus,
      })
    ) {
      return;
    }
    const results = resultData(resultsQueryResult());
    if (!results) return;

    setAnalysisProgress(results);
    if (results.resultFiles && results.resultFiles.length > 0) {
      setAnalysisResultFiles(results.resultFiles);
    }
  });

  return {
    get workspacePath() {
      return resolvedWorkspacePath();
    },
    get analysisResultFiles() {
      return annotateStore.analysisResultFiles;
    },
    setAnalysisProgress,
    setAnalysisResultFiles,
  };
}
