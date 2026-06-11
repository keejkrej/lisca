import type { FrameResult } from "@lisca/utils";
import { useCallback, useEffect, useRef, useState } from "react";

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

const PROMPT_HIT_RADIUS = 12;

function isSmartTool(tool: string): boolean {
  return tool === "smart" || tool === "smart-erase";
}

function findPromptIndexAt(
  prompts: SmartSegmentPoint[],
  x: number,
  y: number,
  radius = PROMPT_HIT_RADIUS,
): number {
  const radiusSq = radius * radius;
  let bestIndex = -1;
  let bestDistanceSq = radiusSq;
  for (let index = 0; index < prompts.length; index += 1) {
    const prompt = prompts[index]!;
    const dx = prompt.x - x;
    const dy = prompt.y - y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq <= bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function clearActiveLabel(mask: Uint8Array, labelValue: number): Uint8Array {
  const next = mask.slice();
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] === labelValue) next[index] = 0;
  }
  return next;
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

  const prompts =
    options.activeLabelValue > 0 ? (promptsByLabel[options.activeLabelValue] ?? []) : [];

  const setPromptsForLabel = useCallback((labelValue: number, nextPrompts: SmartSegmentPoint[]) => {
    setPromptsByLabel((current) => ({
      ...current,
      [labelValue]: nextPrompts,
    }));
  }, []);

  const resetForFrame = useCallback(() => {
    setPromptsByLabel({});
    getBrowserSamEngine().dispose();
    frameKeyRef.current = null;
    pendingClickRef.current = null;
    pendingPromptsRef.current = null;
    pendingLabelRef.current = 0;
    setDownloadState({ open: false, requiresDownload: false, progress: 0, message: "" });
  }, []);

  useEffect(() => {
    if (!isSmartTool(options.tool)) {
      options.onStatus?.(null);
      options.onError?.(null);
    }
  }, [options.onError, options.onStatus, options.tool]);

  useEffect(() => {
    if (!options.frame) {
      resetForFrame();
      return;
    }
    const frameKey = `${options.frame.width}x${options.frame.height}:${options.frame.pixels.byteLength}`;
    if (frameKeyRef.current === frameKey) return;
    frameKeyRef.current = frameKey;
    resetForFrame();
  }, [options.frame, resetForFrame]);

  const updateDownloadProgress = useCallback((progress: SmartSegmentDownloadProgress) => {
    setDownloadState((current) => ({
      ...current,
      open: true,
      progress: progress.progress,
      message: progress.message,
      file: progress.file,
    }));
  }, []);

  const runSegment = useCallback(
    async (labelValue: number, nextPrompts: SmartSegmentPoint[]) => {
      if (!options.frame || labelValue <= 0) return;

      const generation = segmentGenerationRef.current + 1;
      segmentGenerationRef.current = generation;
      options.onError?.(null);
      options.onStatus?.("Segmenting…");
      setBusy(true);

      try {
        const engine = getBrowserSamEngine();
        await engine.prepareFrame(options.frame, updateDownloadProgress);
        if (segmentGenerationRef.current !== generation) return;
        setDownloadState({ open: false, requiresDownload: false, progress: 100, message: "" });

        if (nextPrompts.length === 0) {
          options.onCommit(clearActiveLabel(options.mask, labelValue));
          options.onStatus?.("Smart ready");
          return;
        }

        const binary = await engine.segment(nextPrompts);
        if (segmentGenerationRef.current !== generation) return;
        options.onCommit(
          applyBinaryMask(clearActiveLabel(options.mask, labelValue), binary, labelValue),
        );
        options.onStatus?.("Smart ready");
      } catch (cause) {
        if (segmentGenerationRef.current !== generation) return;
        options.onError?.(cause instanceof Error ? cause.message : String(cause));
        options.onStatus?.(null);
        setDownloadState({ open: false, requiresDownload: false, progress: 0, message: "" });
      } finally {
        if (segmentGenerationRef.current === generation) setBusy(false);
      }
    },
    [
      options.frame,
      options.mask,
      options.onCommit,
      options.onError,
      options.onStatus,
      updateDownloadProgress,
    ],
  );

  const ensureModelForClick = useCallback(
    async (
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
        options.onStatus?.("Loading cached smart model…");
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
      options.onStatus?.("Smart requires a one-time model download");
    },
    [options.onStatus, runSegment, setPromptsForLabel],
  );

  const confirmDownload = useCallback(async () => {
    const nextPrompts = pendingPromptsRef.current;
    const labelValue = pendingLabelRef.current;
    if (!nextPrompts || !options.frame || labelValue <= 0) return;

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
  }, [options.frame, runSegment, setPromptsForLabel]);

  const cancelDownload = useCallback(() => {
    pendingClickRef.current = null;
    pendingPromptsRef.current = null;
    setDownloadState({ open: false, requiresDownload: false, progress: 0, message: "" });
    options.onStatus?.(null);
  }, [options.onStatus]);

  const handleClick = useCallback(
    async (click: SmartSegmentClick) => {
      if (
        !options.enabled ||
        !options.frame ||
        options.tool !== "smart" ||
        options.activeLabelValue <= 0 ||
        busy
      ) {
        return;
      }

      const labelValue = options.activeLabelValue;
      const nextPrompt: SmartSegmentPoint = {
        x: click.x,
        y: click.y,
        label: click.negative ? 0 : 1,
      };
      const nextPrompts = [...prompts, nextPrompt];
      await ensureModelForClick(click, labelValue, nextPrompts);
    },
    [
      busy,
      ensureModelForClick,
      options.activeLabelValue,
      options.enabled,
      options.frame,
      options.tool,
      prompts,
    ],
  );

  const handleEraseClick = useCallback(
    async (click: SmartEraseClick) => {
      if (
        !options.enabled ||
        !options.frame ||
        options.tool !== "smart-erase" ||
        options.activeLabelValue <= 0 ||
        busy
      ) {
        return;
      }

      const labelValue = options.activeLabelValue;
      const promptIndex = findPromptIndexAt(prompts, click.x, click.y);
      if (promptIndex < 0) {
        options.onStatus?.("No point prompt near click");
        return;
      }

      const nextPrompts = prompts.filter((_, index) => index !== promptIndex);
      setPromptsForLabel(labelValue, nextPrompts);
      await ensureModelForClick(
        { x: click.x, y: click.y, negative: false },
        labelValue,
        nextPrompts,
      );
    },
    [
      busy,
      ensureModelForClick,
      options.activeLabelValue,
      options.enabled,
      options.frame,
      options.onStatus,
      options.tool,
      prompts,
      setPromptsForLabel,
    ],
  );

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
