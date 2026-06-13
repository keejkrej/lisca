import type { AnalysisProgress, StudioAnalysisCsvFile } from "@lisca/contracts";
import { resultData } from "@lisca/client/atoms";
import { useAtomValue } from "@effect-atom/atom-react";
import { useEffect } from "react";

import { analysisResultsAtom, analysisResultsIdleAtom } from "../atoms/studio-analysis-atoms";
import { useStudioAnnotateStore } from "./studio-annotate-store";
import { useStudioStore } from "./studio-store";

export type StudioResultState = {
  workspacePath: string | null;
  analysisResultFiles: StudioAnalysisCsvFile[];
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setAnalysisResultFiles: (files: StudioAnalysisCsvFile[]) => void;
};

export function useStudioResultState(): StudioResultState {
  const saveTo = useStudioStore((state) => state.info1.saveTo);
  const activeWorkspacePath = saveTo.trim() || null;
  const { workspacePath, analysisResultFiles, setAnalysisProgress, setAnalysisResultFiles } =
    useStudioAnnotateStore();

  const resolvedWorkspacePath = workspacePath?.trim() || activeWorkspacePath;
  const hasStoredResultFiles = analysisResultFiles.length > 0;
  const resultsAtom = resolvedWorkspacePath
    ? analysisResultsAtom(resolvedWorkspacePath)
    : analysisResultsIdleAtom;
  const resultsQueryResult = useAtomValue(
    hasStoredResultFiles ? analysisResultsIdleAtom : resultsAtom,
  );

  useEffect(() => {
    if (hasStoredResultFiles) return;
    const results = resultData(resultsQueryResult);
    if (!results) return;

    setAnalysisProgress(results);
    if (results.resultFiles && results.resultFiles.length > 0) {
      setAnalysisResultFiles(results.resultFiles);
    }
  }, [hasStoredResultFiles, resultsQueryResult, setAnalysisProgress, setAnalysisResultFiles]);

  return {
    workspacePath: resolvedWorkspacePath,
    analysisResultFiles,
    setAnalysisProgress,
    setAnalysisResultFiles,
  };
}
