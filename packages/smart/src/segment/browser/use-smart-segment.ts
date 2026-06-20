import type { FrameResult } from "@lisca/utils";
import { findSmartSegmentPromptIndexAt, smartSegmentPromptFrameRadius } from "@lisca/utils";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { applyBinaryMask } from "../mask";
import type { SmartSegmentPoint } from "../types";
import { getBrowserSamEngine, type SmartSegmentDownloadProgress } from "./sam-engine";
import { isSamModelCached } from "./sam-model-cache";

export type SmartSegmentClick = {
  x: number;
  y: number;
  negative: boolean;
};

export type SmartEraseClick = {
  x: number;
  y: number;
};

export type SmartSegmentDownloadState = {
  open: boolean;
  requiresDownload: boolean;
  progress: number;
  message: string;
  file?: string;
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

function resetSmartSegmentSession(
  setPromptsByLabel: Dispatch<SetStateAction<Record<number, SmartSegmentPoint[]>>>,
  setDownloadState: Dispatch<SetStateAction<SmartSegmentDownloadState>>,
  refs: {
    frameKeyRef: MutableRefObject<string | null>;
    pendingClickRef: MutableRefObject<SmartSegmentClick | null>;
    pendingPromptsRef: MutableRefObject<SmartSegmentPoint[] | null>;
    pendingLabelRef: MutableRefObject<number>;
  },
) {
  setPromptsByLabel({});
  getBrowserSamEngine().dispose();
  refs.frameKeyRef.current = null;
  refs.pendingClickRef.current = null;
  refs.pendingPromptsRef.current = null;
  refs.pendingLabelRef.current = 0;
  setDownloadState({ open: false, requiresDownload: false, progress: 0, message: "" });
}

export function useSmartSegment(options: {
  frame: FrameResult | null;
  tool: string;
  activeLabelValue: number;
  mask: Uint8Array;
  enabled: boolean;
  onCommit: (mask: Uint8Array) => void;
  onStatus?: (status: string | null) => void;
  onError?: (error: string | null) => void;
}) {
  const [promptsByLabel, setPromptsByLabel] = useState<Record<number, SmartSegmentPoint[]>>({});
  const [busy, setBusy] = useState(false);
  const [downloadState, setDownloadState] = useState<SmartSegmentDownloadState>({
    open: false,
    requiresDownload: false,
    progress: 0,
    message: "",
  });
  const frameKeyRef = useRef<string | null>(null);
  const segmentGenerationRef = useRef(0);
  const pendingClickRef = useRef<SmartSegmentClick | null>(null);
  const pendingPromptsRef = useRef<SmartSegmentPoint[] | null>(null);
  const pendingLabelRef = useRef(0);
  const onCommitRef = useRef(options.onCommit);
  const onStatusRef = useRef(options.onStatus);
  const onErrorRef = useRef(options.onError);
  onCommitRef.current = options.onCommit;
  onStatusRef.current = options.onStatus;
  onErrorRef.current = options.onError;

  const { frame, tool, activeLabelValue, mask, enabled } = options;
  const prompts = activeLabelValue > 0 ? (promptsByLabel[activeLabelValue] ?? []) : [];

  const setPromptsForLabel = (labelValue: number, nextPrompts: SmartSegmentPoint[]) => {
    setPromptsByLabel((current) => ({
      ...current,
      [labelValue]: nextPrompts,
    }));
  };

  const resetForFrame = () => {
    resetSmartSegmentSession(setPromptsByLabel, setDownloadState, {
      frameKeyRef,
      pendingClickRef,
      pendingPromptsRef,
      pendingLabelRef,
    });
  };

  useEffect(() => {
    if (!isSmartTool(tool)) {
      onStatusRef.current?.(null);
      onErrorRef.current?.(null);
    }
  }, [tool]);

  useEffect(() => {
    const resetSession = () =>
      resetSmartSegmentSession(setPromptsByLabel, setDownloadState, {
        frameKeyRef,
        pendingClickRef,
        pendingPromptsRef,
        pendingLabelRef,
      });

    if (!frame) {
      resetSession();
      return;
    }
    const frameKey = `${frame.width}x${frame.height}:${frame.pixels.byteLength}`;
    if (frameKeyRef.current === frameKey) return;
    frameKeyRef.current = frameKey;
    resetSession();
  }, [frame]);

  const updateDownloadProgress = (progress: SmartSegmentDownloadProgress) => {
    setDownloadState((current) => ({
      ...current,
      open: true,
      progress: progress.progress,
      message: progress.message,
      file: progress.file,
    }));
  };

  const runSegment = async (labelValue: number, nextPrompts: SmartSegmentPoint[]) => {
    if (!frame || labelValue <= 0) return;

    const generation = segmentGenerationRef.current + 1;
    segmentGenerationRef.current = generation;
    onErrorRef.current?.(null);
    onStatusRef.current?.("Segmenting…");
    setBusy(true);

    try {
      const engine = getBrowserSamEngine();
      await engine.prepareFrame(frame, updateDownloadProgress);
      if (segmentGenerationRef.current !== generation) return;
      setDownloadState({ open: false, requiresDownload: false, progress: 100, message: "" });

      if (nextPrompts.length === 0) {
        onCommitRef.current(clearActiveLabel(mask, labelValue));
        onStatusRef.current?.("Smart ready");
        return;
      }

      const binary = await engine.segment(nextPrompts);
      if (segmentGenerationRef.current !== generation) return;
      onCommitRef.current(applyBinaryMask(clearActiveLabel(mask, labelValue), binary, labelValue));
      onStatusRef.current?.("Smart ready");
    } catch (cause) {
      if (segmentGenerationRef.current !== generation) return;
      onErrorRef.current?.(cause instanceof Error ? cause.message : String(cause));
      onStatusRef.current?.(null);
      setDownloadState({ open: false, requiresDownload: false, progress: 0, message: "" });
    } finally {
      if (segmentGenerationRef.current === generation) setBusy(false);
    }
  };

  const ensureModelForClick = async (
    click: SmartSegmentClick,
    labelValue: number,
    nextPrompts: SmartSegmentPoint[],
  ) => {
    pendingPromptsRef.current = nextPrompts;
    pendingLabelRef.current = labelValue;
    const engine = getBrowserSamEngine();
    if (engine.isModelLoaded()) {
      setPromptsForLabel(labelValue, nextPrompts);
      await runSegment(labelValue, nextPrompts);
      return;
    }

    const cached = await isSamModelCached();
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

    pendingClickRef.current = click;
    setDownloadState({
      open: true,
      requiresDownload: true,
      progress: 0,
      message: "Confirm to download the smart model",
    });
    onStatusRef.current?.("Smart requires a one-time model download");
  };

  const confirmDownload = async () => {
    const nextPrompts = pendingPromptsRef.current;
    const labelValue = pendingLabelRef.current;
    if (!nextPrompts || !frame || labelValue <= 0) return;

    pendingClickRef.current = null;
    pendingPromptsRef.current = null;

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
    pendingClickRef.current = null;
    pendingPromptsRef.current = null;
    setDownloadState({ open: false, requiresDownload: false, progress: 0, message: "" });
    onStatusRef.current?.(null);
  };

  const handleClick = async (click: SmartSegmentClick) => {
    if (!enabled || !frame || tool !== "smart" || activeLabelValue <= 0 || busy) {
      return;
    }

    const labelValue = activeLabelValue;
    const currentPrompts = labelValue > 0 ? (promptsByLabel[labelValue] ?? []) : [];
    const nextPrompt: SmartSegmentPoint = {
      x: click.x,
      y: click.y,
      label: click.negative ? 0 : 1,
    };
    const nextPrompts = [...currentPrompts, nextPrompt];
    await ensureModelForClick(click, labelValue, nextPrompts);
  };

  const handleEraseClick = async (click: SmartEraseClick) => {
    if (!enabled || !frame || tool !== "smart-erase" || activeLabelValue <= 0 || busy) {
      return;
    }

    const labelValue = activeLabelValue;
    const currentPrompts = labelValue > 0 ? (promptsByLabel[labelValue] ?? []) : [];
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
    await ensureModelForClick(
      { x: click.x, y: click.y, negative: promptIndex < 0 },
      labelValue,
      nextPrompts,
    );
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
