import type { FrameResult } from "@lisca/utils";
import { useCallback, useEffect, useRef, useState } from "react";

import { applyBinaryMask } from "../mask";
import type { SmartSegmentPoint } from "../types";
import { getBrowserSamEngine } from "./sam-engine";

export type SmartSegmentClick = {
  x: number;
  y: number;
  negative: boolean;
};

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
  const [prompts, setPrompts] = useState<SmartSegmentPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const frameKeyRef = useRef<string | null>(null);
  const prepareGenerationRef = useRef(0);
  const segmentGenerationRef = useRef(0);

  const clearPrompts = useCallback(() => {
    setPrompts([]);
    getBrowserSamEngine().dispose();
    frameKeyRef.current = null;
  }, []);

  useEffect(() => {
    if (options.tool !== "smart-segment") {
      clearPrompts();
      options.onStatus?.(null);
      options.onError?.(null);
    }
  }, [clearPrompts, options.onError, options.onStatus, options.tool]);

  useEffect(() => {
    if (!options.enabled || !options.frame || options.tool !== "smart-segment") return;

    const frameKey = `${options.frame.width}x${options.frame.height}:${options.frame.pixels.byteLength}`;
    if (frameKeyRef.current === frameKey) return;

    frameKeyRef.current = frameKey;
    setPrompts([]);
    const generation = prepareGenerationRef.current + 1;
    prepareGenerationRef.current = generation;

    options.onError?.(null);
    options.onStatus?.("Loading smart segment model…");
    setBusy(true);

    void getBrowserSamEngine()
      .prepareFrame(options.frame)
      .then(() => {
        if (prepareGenerationRef.current !== generation) return;
        options.onStatus?.("Smart segment ready");
      })
      .catch((cause) => {
        if (prepareGenerationRef.current !== generation) return;
        options.onError?.(cause instanceof Error ? cause.message : String(cause));
        options.onStatus?.(null);
      })
      .finally(() => {
        if (prepareGenerationRef.current === generation) setBusy(false);
      });
  }, [options.enabled, options.frame, options.onError, options.onStatus, options.tool]);

  const handleClick = useCallback(
    async (click: SmartSegmentClick) => {
      if (
        !options.enabled ||
        !options.frame ||
        options.tool !== "smart-segment" ||
        options.activeLabelValue <= 0 ||
        busy
      ) {
        return;
      }

      const nextPrompt: SmartSegmentPoint = {
        x: click.x,
        y: click.y,
        label: click.negative ? 0 : 1,
      };
      const nextPrompts = [...prompts, nextPrompt];
      setPrompts(nextPrompts);

      const generation = segmentGenerationRef.current + 1;
      segmentGenerationRef.current = generation;
      options.onError?.(null);
      options.onStatus?.("Segmenting…");
      setBusy(true);

      try {
        const engine = getBrowserSamEngine();
        await engine.prepareFrame(options.frame);
        const binary = await engine.segment(nextPrompts);
        if (segmentGenerationRef.current !== generation) return;
        options.onCommit(
          applyBinaryMask(options.mask, binary, options.activeLabelValue),
        );
        options.onStatus?.("Smart segment ready");
      } catch (cause) {
        if (segmentGenerationRef.current !== generation) return;
        setPrompts(prompts);
        options.onError?.(cause instanceof Error ? cause.message : String(cause));
        options.onStatus?.(null);
      } finally {
        if (segmentGenerationRef.current === generation) setBusy(false);
      }
    },
    [
      busy,
      options.activeLabelValue,
      options.enabled,
      options.frame,
      options.mask,
      options.onCommit,
      options.onError,
      options.onStatus,
      options.tool,
      prompts,
    ],
  );

  return {
    prompts,
    busy,
    handleClick,
    clearPrompts,
  };
}
