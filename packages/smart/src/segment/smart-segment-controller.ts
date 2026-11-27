import type { FrameResult } from "@lisca/utils";
import { findSmartSegmentPromptIndexAt, smartSegmentPromptFrameRadius } from "@lisca/utils";

import type { SmartModelDownloadState, SmartModelGate } from "../shared/model-gate";
import { applyBinaryMask } from "./mask";
import type { SmartSegmentProvider } from "./provider";
import type { SmartSegmentPoint } from "./types";

export type SmartSegmentClick = {
  x: number;
  y: number;
  negative: boolean;
};

export type SmartEraseClick = {
  x: number;
  y: number;
};

export type SmartSegmentDownloadState = SmartModelDownloadState;

export type SmartSegmentContext = {
  frame: FrameResult | null;
  /** Optional logical plane key (e.g. `pos:roi:channel:time:z`). When unchanged across contrast edits, active point prompts are preserved. */
  frameKey?: string | null | undefined;
  tool: string;
  activeLabelValue: number;
  mask: Uint8Array;
  enabled: boolean;
};

export type SmartSegmentState = {
  promptsByLabel: Record<number, SmartSegmentPoint[]>;
  prompts: SmartSegmentPoint[];
  busy: boolean;
  downloadState: SmartSegmentDownloadState;
};

export type SmartSegmentControllerOptions = {
  provider: SmartSegmentProvider;
  model?: SmartModelGate | undefined;
  initialContext: SmartSegmentContext;
  onCommit: (mask: Uint8Array) => void;
  onStatus?: ((status: string | null) => void) | undefined;
  onError?: ((error: string | null) => void) | undefined;
};

export type SmartSegmentController = {
  getState: () => SmartSegmentState;
  subscribe: (listener: () => void) => () => void;
  sync: (context: SmartSegmentContext) => void;
  handleClick: (click: SmartSegmentClick) => Promise<void>;
  handleEraseClick: (click: SmartEraseClick) => Promise<void>;
  clearPrompts: () => void;
  confirmDownload: () => Promise<void>;
  cancelDownload: () => void;
  dispose: () => void;
};

function isSmartTool(tool: string): boolean {
  return tool === "smart" || tool === "smart-erase";
}

function findPromptIndexAt(
  prompts: SmartSegmentPoint[],
  x: number,
  y: number,
  frame: FrameResult,
): number {
  return findSmartSegmentPromptIndexAt(
    prompts,
    x,
    y,
    smartSegmentPromptFrameRadius(frame.width, frame.height),
  );
}

function clearActiveLabel(mask: Uint8Array, labelValue: number): Uint8Array {
  const next = mask.slice();
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] === labelValue) next[index] = 0;
  }
  return next;
}

const emptyDownloadState = (): SmartSegmentDownloadState => ({
  open: false,
  requiresDownload: false,
  progress: 0,
  message: "",
});

export function createSmartSegmentController(
  options: SmartSegmentControllerOptions,
): SmartSegmentController {
  let context: SmartSegmentContext = { ...options.initialContext };
  let promptsByLabel: Record<number, SmartSegmentPoint[]> = {};
  let busy = false;
  let downloadState: SmartSegmentDownloadState = emptyDownloadState();
  let lastFrame: FrameResult | null = context.frame;
  let lastFrameKey: string | null = context.frameKey ?? null;
  let lastTool: string = context.tool;
  let pendingPrompts: SmartSegmentPoint[] | null = null;
  let pendingLabel = 0;
  let segmentGeneration = 0;
  let disposed = false;

  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };

  const getState = (): SmartSegmentState => ({
    promptsByLabel,
    prompts: context.activeLabelValue > 0 ? (promptsByLabel[context.activeLabelValue] ?? []) : [],
    busy,
    downloadState,
  });

  const setPromptsForLabel = (labelValue: number, nextPrompts: SmartSegmentPoint[]) => {
    promptsByLabel = { ...promptsByLabel, [labelValue]: nextPrompts };
    notify();
  };

  const resetSession = () => {
    promptsByLabel = {};
    options.provider.dispose();
    lastFrame = null;
    lastFrameKey = null;
    pendingPrompts = null;
    pendingLabel = 0;
    if (options.model) {
      downloadState = emptyDownloadState();
    }
    notify();
  };

  const clearPrompts = () => {
    segmentGeneration += 1;
    busy = false;
    resetSession();
  };

  const sync = (next: SmartSegmentContext) => {
    const prevTool = lastTool;
    context = { ...next };
    lastTool = next.tool;

    if (prevTool !== next.tool && !isSmartTool(next.tool)) {
      options.onStatus?.(null);
      options.onError?.(null);
    }

    const nextFrame = next.frame;
    const nextKey = next.frameKey ?? null;
    const hasFrameKey = next.frameKey !== undefined;
    if (lastFrame !== nextFrame || lastFrameKey !== nextKey) {
      segmentGeneration += 1;
      busy = false;
      const sameLogicalPlane =
        hasFrameKey &&
        nextFrame !== null &&
        lastFrame !== null &&
        nextKey !== null &&
        lastFrameKey === nextKey &&
        lastFrame.width === nextFrame.width &&
        lastFrame.height === nextFrame.height;
      if (sameLogicalPlane) {
        options.provider.dispose();
        lastFrame = nextFrame;
        lastFrameKey = nextKey;
        notify();
        return;
      }
      resetSession();
      lastFrame = nextFrame;
      lastFrameKey = nextKey;
    }
  };

  const updateDownloadProgress = (progress: {
    progress: number;
    message: string;
    file?: string | undefined;
  }) => {
    downloadState = {
      ...downloadState,
      open: true,
      progress: progress.progress,
      message: progress.message,
      ...(progress.file !== undefined ? { file: progress.file } : {}),
    };
    notify();
  };

  const runSegment = async (
    frame: FrameResult,
    labelValue: number,
    nextPrompts: SmartSegmentPoint[],
  ) => {
    if (labelValue <= 0) return;

    const generation = segmentGeneration + 1;
    segmentGeneration = generation;
    const isCurrentRun = () =>
      !disposed && segmentGeneration === generation && context.frame === frame;
    options.onError?.(null);
    options.onStatus?.("Segmenting…");
    busy = true;
    notify();

    try {
      await options.provider.prepareFrame(
        frame,
        options.model
          ? {
              onProgress: (progress) => {
                if (isCurrentRun()) updateDownloadProgress(progress);
              },
            }
          : undefined,
      );
      if (!isCurrentRun()) return;
      if (options.model) {
        downloadState = {
          open: false,
          requiresDownload: false,
          progress: 100,
          message: "",
        };
        notify();
      }

      if (nextPrompts.length === 0) {
        options.onCommit(clearActiveLabel(context.mask, labelValue));
        options.onStatus?.("Smart ready");
        return;
      }

      const binary = await options.provider.segment(nextPrompts);
      if (!isCurrentRun()) return;
      options.onCommit(
        applyBinaryMask(clearActiveLabel(context.mask, labelValue), binary, labelValue),
      );
      options.onStatus?.("Smart ready");
    } catch (cause) {
      if (!isCurrentRun()) return;
      options.onError?.(cause instanceof Error ? cause.message : String(cause));
      options.onStatus?.(null);
      if (options.model) {
        downloadState = emptyDownloadState();
        notify();
      }
    } finally {
      if (isCurrentRun()) {
        busy = false;
        notify();
      }
    }
  };

  const ensureModelForPrompts = async (labelValue: number, nextPrompts: SmartSegmentPoint[]) => {
    const frame = context.frame;
    if (disposed || !frame) return;
    pendingPrompts = nextPrompts;
    pendingLabel = labelValue;

    if (!options.model) {
      setPromptsForLabel(labelValue, nextPrompts);
      await runSegment(frame, labelValue, nextPrompts);
      return;
    }

    const model = options.model;
    if (model.isLoaded()) {
      setPromptsForLabel(labelValue, nextPrompts);
      await runSegment(frame, labelValue, nextPrompts);
      return;
    }

    const cached = await model.isCached();
    if (disposed || context.frame !== frame) return;
    if (cached) {
      setPromptsForLabel(labelValue, nextPrompts);
      downloadState = {
        open: true,
        requiresDownload: false,
        progress: 0,
        message: "Loading cached smart model…",
      };
      notify();
      options.onStatus?.("Loading cached smart model…");
      await runSegment(frame, labelValue, nextPrompts);
      return;
    }

    downloadState = {
      open: true,
      requiresDownload: true,
      progress: 0,
      message: "Confirm to download the smart model",
    };
    notify();
    options.onStatus?.("Smart requires a one-time model download");
  };

  const confirmDownload = async () => {
    const nextPrompts = pendingPrompts;
    const labelValue = pendingLabel;
    const frame = context.frame;
    if (disposed || !nextPrompts || !frame || labelValue <= 0) return;

    pendingPrompts = null;
    downloadState = {
      open: true,
      requiresDownload: true,
      progress: 0,
      message: "Starting model download…",
    };
    notify();
    setPromptsForLabel(labelValue, nextPrompts);
    await runSegment(frame, labelValue, nextPrompts);
  };

  const cancelDownload = () => {
    pendingPrompts = null;
    if (options.model) {
      downloadState = emptyDownloadState();
      notify();
    }
    options.onStatus?.(null);
  };

  const handleClick = async (click: SmartSegmentClick) => {
    const frame = context.frame;
    const labelValue = context.activeLabelValue;
    if (!context.enabled || !frame || context.tool !== "smart" || labelValue <= 0 || busy) {
      return;
    }
    const currentPrompts = promptsByLabel[labelValue] ?? [];
    const nextPrompts: SmartSegmentPoint[] = [
      ...currentPrompts,
      { x: click.x, y: click.y, label: click.negative ? 0 : 1 },
    ];
    await ensureModelForPrompts(labelValue, nextPrompts);
  };

  const handleEraseClick = async (click: SmartEraseClick) => {
    const frame = context.frame;
    const labelValue = context.activeLabelValue;
    if (!context.enabled || !frame || context.tool !== "smart-erase" || labelValue <= 0 || busy) {
      return;
    }
    const currentPrompts = promptsByLabel[labelValue] ?? [];
    const promptIndex = findPromptIndexAt(currentPrompts, click.x, click.y, frame);
    const nextPrompts: SmartSegmentPoint[] =
      promptIndex >= 0
        ? currentPrompts.filter((_, index) => index !== promptIndex)
        : [...currentPrompts, { x: click.x, y: click.y, label: 0 }];
    await ensureModelForPrompts(labelValue, nextPrompts);
  };

  const dispose = () => {
    disposed = true;
    segmentGeneration += 1;
    options.provider.dispose();
    lastFrame = null;
    pendingPrompts = null;
    pendingLabel = 0;
    listeners.clear();
  };

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    sync,
    handleClick,
    handleEraseClick,
    clearPrompts,
    confirmDownload,
    cancelDownload,
    dispose,
  };
}
