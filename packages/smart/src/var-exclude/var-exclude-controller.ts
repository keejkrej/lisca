import type { AlignGridPatternCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";

import type { VarExcludeProvider } from "./provider";

export type VarExcludeContext = {
  frame: FrameResult | null;
  grid: AlignGridState;
  currentExcludedPatterns: AlignGridPatternCoord[];
  enabled: boolean;
};

export type VarExcludeControllerOptions = {
  provider: VarExcludeProvider;
  initialContext: VarExcludeContext;
  onPreview?:
    | ((preview: NonNullable<Awaited<ReturnType<VarExcludeProvider["preview"]>>>) => void)
    | undefined;
  onStatus?: ((status: string | null) => void) | undefined;
  onError?: ((error: string | null) => void) | undefined;
};

export type VarExcludeController = {
  isActive: () => boolean;
  subscribe: (listener: () => void) => () => void;
  sync: (context: VarExcludeContext) => void;
  excludeEdgeAndVariation: () => Promise<AlignGridPatternCoord[]>;
  requestPreview: () => Promise<void>;
  dispose: () => void;
};

export function createVarExcludeController(
  options: VarExcludeControllerOptions,
): VarExcludeController {
  let context: VarExcludeContext = { ...options.initialContext };
  let busy = false;
  let runGeneration = 0;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };

  const buildInput = () => {
    if (!context.frame) return null;
    return {
      frame: context.frame,
      grid: context.grid,
      currentExcludedPatterns: context.currentExcludedPatterns,
    };
  };

  const excludeEdgeAndVariation = async (): Promise<AlignGridPatternCoord[]> => {
    const input = buildInput();
    if (!input || !context.enabled) return [];
    const generation = runGeneration + 1;
    runGeneration = generation;

    options.onError?.(null);
    options.onStatus?.("Log-std exclude");
    busy = true;
    notify();
    try {
      const patterns = await options.provider.excludeEdgeAndVariation(input);
      if (runGeneration !== generation) return [];
      options.onStatus?.(null);
      return patterns;
    } catch (cause) {
      if (runGeneration !== generation) return [];
      options.onError?.(cause instanceof Error ? cause.message : String(cause));
      options.onStatus?.(null);
      throw cause;
    } finally {
      if (runGeneration === generation) {
        busy = false;
        notify();
      }
    }
  };

  const requestPreview = async () => {
    const input = buildInput();
    if (!input || !context.enabled) return;
    const generation = runGeneration + 1;
    runGeneration = generation;

    options.onError?.(null);
    options.onStatus?.("Log-std exclude preview");
    busy = true;
    notify();
    try {
      const preview = await options.provider.preview(input);
      if (runGeneration !== generation) return;
      if (!preview) {
        options.onStatus?.("No visible patterns for log-std exclude");
        return;
      }
      options.onPreview?.(preview);
      options.onStatus?.(null);
    } catch (cause) {
      if (runGeneration !== generation) return;
      options.onError?.(cause instanceof Error ? cause.message : String(cause));
      options.onStatus?.(null);
    } finally {
      if (runGeneration === generation) {
        busy = false;
        notify();
      }
    }
  };

  return {
    isActive: () => busy,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    sync(next) {
      context = { ...next };
    },
    excludeEdgeAndVariation,
    requestPreview,
    dispose() {
      runGeneration += 1;
      listeners.clear();
    },
  };
}
