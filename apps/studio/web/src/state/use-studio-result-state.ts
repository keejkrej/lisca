import type { AnalysisProgress, StudioAnalysisCsvFile } from "@lisca/contracts";
import { resultData } from "@lisca/client/atoms";
import type { Atom } from "@effect-atom/atom-solid";
import { RegistryContext } from "@effect-atom/atom-solid";
import { createEffect, createSignal, onCleanup, useContext, type Accessor } from "solid-js";

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
  const activeWorkspacePath = () => saveTo().trim() || null;
  const annotateStore = useStudioAnnotateStore();
  const {
    setAnalysisProgress,
    setAnalysisResultFiles,
  } = annotateStore;

  const resolvedWorkspacePath = () =>
    annotateStore.workspacePath?.trim() || activeWorkspacePath();
  const hasStoredResultFiles = () => annotateStore.analysisResultFiles.length > 0;
  const resultsQueryResult = useSelectedAtomValue(() => {
    if (hasStoredResultFiles()) return analysisResultsIdleAtom;
    const path = resolvedWorkspacePath();
    return path ? analysisResultsAtom(path) : analysisResultsIdleAtom;
  });

  createEffect(() => {
    if (hasStoredResultFiles()) return;
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

function useSelectedAtomValue<A>(selectAtom: () => Atom.Atom<A>): Accessor<A> {
  const registry = useContext(RegistryContext);
  const [value, setValue] = createSignal(registry.get(selectAtom()));
  createEffect(() => {
    const atom = selectAtom();
    setValue(() => registry.get(atom));
    onCleanup(registry.subscribe(atom, setValue as (next: A) => void));
  });
  return value;
}