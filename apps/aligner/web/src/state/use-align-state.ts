import {
  useAlignStateCore,
  type AlignState,
  type CropConfirmState,
  type VariationExcludePreview,
} from "@lisca/client/use-align-state-core";
import { useCanvasResourceTransaction } from "@lisca/ui/features";
import { useShellWorkspace } from "@lisca/ui/shell";

import { alignerClient, toErrorMessage } from "../api/aligner-port";
import { scanIdleAtom, scanSourceAtom } from "../atoms/aligner-query-atoms";
import {
  alignerUiActions,
  alignerUiAtom,
  savedAlignStateKey,
  sourceKey,
} from "../atoms/aligner-ui-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";

export type { AlignState, CropConfirmState, VariationExcludePreview };
export type { ExcludedByPosition } from "../atoms/aligner-ui-atoms";

export function useAlignState(): AlignState {
  return useAlignStateCore({
    alignerClient,
    toErrorMessage,
    effectErrorMessage,
    loadFrameEffect,
    alignerUiAtom,
    alignerUiActions,
    scanSourceAtom,
    scanIdleAtom,
    savedAlignStateKey,
    sourceKey,
    useShellWorkspace,
    useCanvasResourceTransaction,
  });
}
