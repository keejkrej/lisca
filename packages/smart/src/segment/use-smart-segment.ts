import type { FrameResult } from "@lisca/utils";
import { findSmartSegmentPromptIndexAt, smartSegmentPromptFrameRadius } from "@lisca/utils";
import { createEffect, createMemo, createSignal, type Setter } from "solid-js";

import type { SmartModelDownloadState, SmartModelGate } from "../shared/model-gate";
import { useLatestRef } from "../shared/use-latest-ref";
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

type SmartSegmentSessionRefs = {
  frameKey: string | null;
  pendingPrompts: SmartSegmentPoint[] | null;
  pendingLabel: number;
};

function resetSmartSegmentSession(
  setPromptsByLabel: Setter<Record<number, SmartSegmentPoint[]>>,
  setDownloadState: Setter<SmartSegmentDownloadState> | null,
  refs: SmartSegmentSessionRefs,
  provider: SmartSegmentProvider,
) {
  setPromptsByLabel({});
  provider.dispose();
  refs.frameKey = null;
  refs.pendingPrompts = null;
  refs.pendingLabel = 0;
  setDownloadState?.({ open: false, requiresDownload: false, progress: 0, message: "" });
}

export function useSmartSegment(options: {
  provider: SmartSegmentProvider;
  model?: SmartModelGate;
  frame: FrameResult | null;
  tool: string;
  activeLabelValue: number;
  mask: Uint8Array;
  enabled: boolean;
  onCommit: (mask: Uint8Array) => void;
  onStatus?: (status: string | null) => void;
  onError?: (error: string | null) => void;
}) {
  const [promptsByLabel, setPromptsByLabel] = createSignal<Record<number, SmartSegmentPoint[]>>(
    {},
  );
  const [busy, setBusy] = createSignal(false);
  const [downloadState, setDownloadState] = createSignal<SmartSegmentDownloadState>({
    open: false,
    requiresDownload: false,
    progress: 0,
    message: "",
  });

  const sessionRefs: SmartSegmentSessionRefs = {
    frameKey: null,
    pendingPrompts: null,
    pendingLabel: 0,
  };

  let segmentGeneration = 0;

  const onCommitRef = useLatestRef(() => options.onCommit);
  const onStatusRef = useLatestRef(() => options.onStatus);
  const onErrorRef = useLatestRef(() => options.onError);
  const setDownloadStateForModel = options.model ? setDownloadState : null;

  const prompts = createMemo(() => {
    const labelValue = options.activeLabelValue;
    return labelValue > 0 ? (promptsByLabel()[labelValue] ?? []) : [];
  });

  const setPromptsForLabel = (labelValue: number, nextPrompts: SmartSegmentPoint[]) => {
    setPromptsByLabel((current) => ({
      ...current,
      [labelValue]: nextPrompts,
    }));
  };

  const resetForFrame = () => {
    resetSmartSegmentSession(
      setPromptsByLabel,
      setDownloadStateForModel,
      sessionRefs,
      options.provider,
    );
  };

  createEffect(() => {
    const tool = options.tool;
    if (!isSmartTool(tool)) {
      onStatusRef.current?.(null);
      onErrorRef.current?.(null);
    }
  });

  createEffect(() => {
    const frame = options.frame;
    if (!frame) {
      resetSmartSegmentSession(
        setPromptsByLabel,
        setDownloadStateForModel,
        sessionRefs,
        options.provider,
      );
      return;
    }
    const frameKey = `${frame.width}x${frame.height}:${frame.pixels.byteLength}`;
    if (sessionRefs.frameKey === frameKey) return;
    sessionRefs.frameKey = frameKey;
    resetSmartSegmentSession(
      setPromptsByLabel,
      setDownloadStateForModel,
      sessionRefs,
      options.provider,
    );
  });

  const updateDownloadProgress = (progress: {
    progress: number;
    message: string;
    file?: string;
  }) => {
    setDownloadState((current) => ({
      ...current,
      open: true,
      progress: progress.progress,
      message: progress.message,
      file: progress.file,
    }));
  };

  const runSegment = async (labelValue: number, nextPrompts: SmartSegmentPoint[]) => {
    const frame = options.frame;
    if (!frame || labelValue <= 0) return;

    const generation = segmentGeneration + 1;
    segmentGeneration = generation;
    onErrorRef.current?.(null);
    onStatusRef.current?.("Segmenting…");
    setBusy(true);

    try {
      await options.provider.prepareFrame(
        frame,
        options.model ? { onProgress: updateDownloadProgress } : undefined,
      );
      if (segmentGeneration !== generation) return;
      setDownloadStateForModel?.({
        open: false,
        requiresDownload: false,
        progress: 100,
        message: "",
      });

      if (nextPrompts.length === 0) {
        onCommitRef.current(clearActiveLabel(options.mask, labelValue));
        onStatusRef.current?.("Smart ready");
        return;
      }

      const binary = await options.provider.segment(nextPrompts);
      if (segmentGeneration !== generation) return;
      onCommitRef.current(
        applyBinaryMask(clearActiveLabel(options.mask, labelValue), binary, labelValue),
      );
      onStatusRef.current?.("Smart ready");
    } catch (cause) {
      if (segmentGeneration !== generation) return;
      onErrorRef.current?.(cause instanceof Error ? cause.message : String(cause));
      onStatusRef.current?.(null);
      setDownloadStateForModel?.({
        open: false,
        requiresDownload: false,
        progress: 0,
        message: "",
      });
    } finally {
      if (segmentGeneration === generation) setBusy(false);
    }
  };

  const ensureModelForPrompts = async (labelValue: number, nextPrompts: SmartSegmentPoint[]) => {
    sessionRefs.pendingPrompts = nextPrompts;
    sessionRefs.pendingLabel = labelValue;

    if (!options.model) {
      setPromptsForLabel(labelValue, nextPrompts);
      await runSegment(labelValue, nextPrompts);
      return;
    }

    const model = options.model;
    if (model.isLoaded()) {
      setPromptsForLabel(labelValue, nextPrompts);
      await runSegment(labelValue, nextPrompts);
      return;
    }

    const cached = await model.isCached();
    if (cached) {
      setPromptsForLabel(labelValue, nextPrompts);
      setDownloadState({
        open: true,
        requiresDownload: false,
        progress: 0,
        message: "Loading cached smart model…",
      });
      onStatusRef.current?.("Loading cached smart model…");
      await runSegment(labelValue, nextPrompts);
      return;
    }

    setDownloadState({
      open: true,
      requiresDownload: true,
      progress: 0,
      message: "Confirm to download the smart model",
    });
    onStatusRef.current?.("Smart requires a one-time model download");
  };

  const confirmDownload = async () => {
    const nextPrompts = sessionRefs.pendingPrompts;
    const labelValue = sessionRefs.pendingLabel;
    if (!nextPrompts || !options.frame || labelValue <= 0) return;

    sessionRefs.pendingPrompts = null;
    setDownloadState({
      open: true,
      requiresDownload: true,
      progress: 0,
      message: "Starting model download…",
    });
    setPromptsForLabel(labelValue, nextPrompts);
    await runSegment(labelValue, nextPrompts);
  };

  const cancelDownload = () => {
    sessionRefs.pendingPrompts = null;
    setDownloadStateForModel?.({ open: false, requiresDownload: false, progress: 0, message: "" });
    onStatusRef.current?.(null);
  };

  const handleClick = async (click: SmartSegmentClick) => {
    if (
      !options.enabled ||
      !options.frame ||
      options.tool !== "smart" ||
      options.activeLabelValue <= 0 ||
      busy()
    ) {
      return;
    }

    const labelValue = options.activeLabelValue;
    const currentPrompts = labelValue > 0 ? (promptsByLabel()[labelValue] ?? []) : [];
    const nextPrompt: SmartSegmentPoint = {
      x: click.x,
      y: click.y,
      label: click.negative ? 0 : 1,
    };
    const nextPrompts = [...currentPrompts, nextPrompt];
    await ensureModelForPrompts(labelValue, nextPrompts);
  };

  const handleEraseClick = async (click: SmartEraseClick) => {
    if (
      !options.enabled ||
      !options.frame ||
      options.tool !== "smart-erase" ||
      options.activeLabelValue <= 0 ||
      busy()
    ) {
      return;
    }

    const frame = options.frame;
    const labelValue = options.activeLabelValue;
    const currentPrompts = labelValue > 0 ? (promptsByLabel()[labelValue] ?? []) : [];
    const promptIndex = findPromptIndexAt(currentPrompts, click.x, click.y, frame);
    const nextPrompts: SmartSegmentPoint[] =
      promptIndex >= 0
        ? currentPrompts.filter((_, index) => index !== promptIndex)
        : [
            ...currentPrompts,
            {
              x: click.x,
              y: click.y,
              label: 0,
            },
          ];
    await ensureModelForPrompts(labelValue, nextPrompts);
  };

  return {
    prompts,
    busy,
    handleClick,
    handleEraseClick,
    clearPrompts: resetForFrame,
    downloadState,
    confirmDownload,
    cancelDownload,
  };
}