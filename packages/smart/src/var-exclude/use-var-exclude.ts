import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { createMemo, createSignal, onCleanup, type Accessor } from "solid-js";

import { useLatestRef } from "../shared/use-latest-ref";
import type { VarExcludeProvider } from "./provider";

export function useVarExclude(options: {
  provider: VarExcludeProvider;
  frame: Accessor<FrameResult | null>;
  grid: Accessor<AlignGridState>;
  currentExcludedCells: Accessor<AlignGridCellCoord[]>;
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
      currentExcludedCells: options.currentExcludedCells(),
    };
  };

  const autoExclude = async (): Promise<AlignGridCellCoord[]> => {
    const input = buildInput();
    if (!input || !options.enabled()) return [];
    const generation = runGeneration + 1;
    runGeneration = generation;

    onErrorRef.current?.(null);
    onStatusRef.current?.("Var exclude");
    setBusy(true);
    try {
      const cells = await options.provider.autoExclude(input);
      if (runGeneration !== generation) return [];
      onStatusRef.current?.(null);
      return cells;
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
    onStatusRef.current?.("Var exclude preview");
    setBusy(true);
    try {
      const preview = await options.provider.preview(input);
      if (runGeneration !== generation) return;
      if (!preview) {
        onStatusRef.current?.("No visible cells for var exclude");
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
    autoExclude,
    requestPreview,
  };
}
