import type { Accessor } from "solid-js";

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
import { alignerUiActions, alignerUiAtom } from "../atoms/aligner-ui-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";

export type { AlignState, CropConfirmState, VariationExcludePreview };
export type { ExcludedByPosition } from "../atoms/aligner-ui-atoms";

export function useAlignState(): Accessor<AlignState> {
  return useAlignStateCore({
    store: {
      atom: alignerUiAtom,
      actions: alignerUiActions,
    },
    backend: {
      client: alignerClient,
      loadFrame: loadFrameEffect,
      toErrorMessage,
      frameErrorMessage: effectErrorMessage,
    },
    scan: {
      forSource: scanSourceAtom,
      idle: scanIdleAtom,
    },
    host: {
      useWorkspace: useShellWorkspace,
      useCanvasTransaction: useCanvasResourceTransaction,
    },
    // Light shell: bbox/align only. Crop is Studio / lisca-crop / pyama-v2.
    enableCrop: false,
  });
}
