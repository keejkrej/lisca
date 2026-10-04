import type {
  AnalysisProgress,
  AnalysisStartRequest,
  StudioAnalysisCsvFile,
} from "@lisca/contracts";
import type { StudioAssayJson } from "@lisca/contracts/assay";
import { logClientEvent } from "@lisca/client/client-log";

export type StudioAnalysisRunDeps = {
  token: number;
  workspacePath: string;
  assayJson: StudioAssayJson;
  saveAssayJson: (workspacePath: string, body: string) => Promise<void>;
  startAnalysis: (input: AnalysisStartRequest) => Promise<AnalysisProgress>;
  subscribe: (requestId: string, onProgress: (progress: AnalysisProgress) => void) => () => void;
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setAnalysisRequestId: (requestId: string | null) => void;
  setAnalysisResultFiles: (files: StudioAnalysisCsvFile[]) => void;
  setStatus: (status: string | null) => void;
  markAssaySaved: () => void;
  toErrorMessage: (cause: unknown, fallback: string) => string;
  onCompleted?: () => void;
  now?: () => number;
  random?: () => string;
};

let nextToken = 0;
let activeToken = 0;

export function studioAnalysisRunActive(): boolean {
  return activeToken !== 0;
}

/** Returns a token while no analysis run is active. */
export function claimStudioAnalysisRun(): number | null {
  if (activeToken !== 0) return null;
  nextToken += 1;
  activeToken = nextToken;
  return activeToken;
}

export function releaseStudioAnalysisRun(token: number): void {
  if (activeToken === token) activeToken = 0;
}

/** Clears the in-flight claim. Tests use this so a failed case cannot block the next one. */
export function resetStudioAnalysisRunForTests(): void {
  activeToken = 0;
  nextToken = 0;
}

function isTerminal(status: AnalysisProgress["status"]): boolean {
  return status === "completed" || status === "error";
}

function queuedProgress(requestId: string, message: string): AnalysisProgress {
  return {
    requestId,
    status: "queued",
    stage: "queued",
    progress: 0,
    message,
    resultFiles: [],
    error: null,
  };
}

function isCurrent(token: number): boolean {
  return activeToken === token;
}

/**
 * Save assay.json and start analysis without living on the Annotate page.
 * Leaving Annotate must not cancel the HTTP start or the progress subscription.
 */
export async function runStudioAnalysis(deps: StudioAnalysisRunDeps): Promise<void> {
  const token = deps.token;
  if (!isCurrent(token)) return;
  const requestId = `studio-analysis-${deps.now?.() ?? Date.now()}-${
    deps.random?.() ?? Math.random().toString(36).slice(2)
  }`;
  deps.setAnalysisRequestId(requestId);
  deps.setAnalysisResultFiles([]);
  deps.setStatus("Saving assay.json");
  deps.setAnalysisProgress(queuedProgress(requestId, "Saving assay.json"));
  let stop = () => {};
  try {
    await deps.saveAssayJson(deps.workspacePath, JSON.stringify(deps.assayJson, null, 2));
    if (!isCurrent(token)) return;
    deps.markAssaySaved();
    deps.setStatus("Starting analysis");
    deps.setAnalysisProgress(queuedProgress(requestId, "Queued analysis"));
    const initial = await deps.startAnalysis({
      workspacePath: deps.workspacePath,
      requestId,
    });
    if (!isCurrent(token)) return;
    deps.setAnalysisProgress(initial);
    if (initial.resultFiles?.length) deps.setAnalysisResultFiles(initial.resultFiles);
    logClientEvent(`analysis started ${requestId}`);
    if (isTerminal(initial.status)) {
      finishTerminal(deps, token, initial);
      return;
    }
    stop = deps.subscribe(requestId, (progress) => {
      if (!isCurrent(token)) return;
      deps.setAnalysisProgress(progress);
      if (progress.resultFiles?.length) deps.setAnalysisResultFiles(progress.resultFiles);
      if (!isTerminal(progress.status)) return;
      stop();
      finishTerminal(deps, token, progress);
    });
  } catch (cause) {
    if (!isCurrent(token)) return;
    stop();
    const message = deps.toErrorMessage(cause, "Analysis failed");
    deps.setAnalysisProgress({
      requestId,
      status: "error",
      stage: "queued",
      progress: 0,
      message: "Analysis failed to start",
      resultFiles: [],
      error: message,
    });
    deps.setStatus(message);
    logClientEvent(`analysis failed ${message}`);
    releaseStudioAnalysisRun(token);
  }
}

function finishTerminal(
  deps: StudioAnalysisRunDeps,
  token: number,
  progress: AnalysisProgress,
): void {
  if (!isCurrent(token)) return;
  if (progress.status === "completed") {
    deps.setStatus("Analysis completed");
    deps.onCompleted?.();
  } else {
    deps.setStatus(progress.error ?? "Analysis failed");
  }
  releaseStudioAnalysisRun(token);
}

/**
 * Change route before any analysis atom writes. The run itself starts on a
 * microtask so the click turn does not publish state beside the navigation.
 */
export function scheduleStudioAnalysis(options: {
  navigate: () => unknown;
  start: () => void;
  onNavigateError: (cause: unknown) => void;
}): boolean {
  try {
    const pending = options.navigate();
    queueMicrotask(options.start);
    void Promise.resolve(pending).catch((cause: unknown) => {
      options.onNavigateError(cause);
    });
    return true;
  } catch (cause) {
    options.onNavigateError(cause);
    return false;
  }
}
