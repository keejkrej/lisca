import type { AlignGridPatternCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { createMemo, createSignal, onCleanup, type Accessor } from "solid-js";

import { useLatestRef } from "../shared/use-latest-ref";
import type { VarExcludeProvider } from "./provider";

export function useVarExclude(options: {
  provider: VarExcludeProvider;
  frame: Accessor<FrameResult | null>;
  grid: Accessor<AlignGridState>;
  currentExcludedPatterns: Accessor<AlignGridPatternCoord[]>;
  enabled: Accessor<boolean>;
  onPreview?: (preview: NonNullable<Awaited<ReturnType<VarExcludeProvider["preview"]>>>) => void;
  onStatus?: (status: string | null) => void;
  onError?: (error: string | null) => void;
}) {
  const [busy, setBusy] = createSignal(false);
  const active = createMemo(() => busy());

  const onPreviewRef = useLatestRef(() => options.onPreview);
  const onStatusRef = useLatestRef(() => options.onStatus);
  const onErrorRef = useLatestRef(() => options.onError);
  let runGeneration = 0;
  onCleanup(() => {
    runGeneration += 1;
  });

  const buildInput = () => {
    const frame = options.frame();
    if (!frame) return null;
    return {
      frame,
      grid: options.grid(),
      currentExcludedPatterns: options.currentExcludedPatterns(),
    };
  };

  const excludeEdgeAndVariation = async (): Promise<AlignGridPatternCoord[]> => {
    const input = buildInput();
    if (!input || !options.enabled()) return [];
    const generation = runGeneration + 1;
    runGeneration = generation;

    onErrorRef.current?.(null);
    onStatusRef.current?.("Log-std exclude");
    setBusy(true);
    try {
      const patterns = await options.provider.excludeEdgeAndVariation(input);
      if (runGeneration !== generation) return [];
      onStatusRef.current?.(null);
      return patterns;
    } catch (cause) {
      if (runGeneration !== generation) return [];
      onErrorRef.current?.(cause instanceof Error ? cause.message : String(cause));
      onStatusRef.current?.(null);
      throw cause;
    } finally {
      if (runGeneration === generation) setBusy(false);
    }
  };

  const requestPreview = async () => {
    const input = buildInput();
    if (!input || !options.enabled()) return;
    const generation = runGeneration + 1;
    runGeneration = generation;

    onErrorRef.current?.(null);
    onStatusRef.current?.("Log-std exclude preview");
    setBusy(true);
    try {
      const preview = await options.provider.preview(input);
      if (runGeneration !== generation) return;
      if (!preview) {
        onStatusRef.current?.("No visible patterns for log-std exclude");
        return;
      }
      onPreviewRef.current?.(preview);
      onStatusRef.current?.(null);
    } catch (cause) {
      if (runGeneration !== generation) return;
      onErrorRef.current?.(cause instanceof Error ? cause.message : String(cause));
      onStatusRef.current?.(null);
    } finally {
      if (runGeneration === generation) setBusy(false);
    }
  };

  return {
    active,
    excludeEdgeAndVariation,
    requestPreview,
  };
}
