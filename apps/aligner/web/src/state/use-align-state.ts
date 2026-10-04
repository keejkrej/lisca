import { useAtom } from "@effect/atom-solid";
import { AssayJsonFileSchema, decodeJsonResult } from "@lisca/contracts";
import type { AssayType } from "@lisca/contracts";
import { runClientEffect } from "@lisca/client/runtime";
import { defaultStudioAlignTime, studioAlignFrameDefault } from "@lisca/client/studio/source";
import {
  useAlignStateCore,
  type AlignState,
  type CropConfirmState,
  type VariationExcludePreview,
} from "@lisca/client/use-align-state-core";
import { useCanvasResourceTransaction } from "@lisca/ui/features";
import { useShellWorkspace } from "@lisca/ui/shell";
import * as Result from "effect/Result";
import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";

import { alignerClient, toErrorMessage } from "../api/aligner-port";
import { scanIdleAtom, scanSourceAtom } from "../atoms/aligner-query-atoms";
import { alignerUiActions, alignerUiAtom } from "../atoms/aligner-ui-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";

export type { AlignState, CropConfirmState, VariationExcludePreview };
export type { ExcludedByPosition } from "../atoms/aligner-ui-atoms";

function workspaceAssayJsonPath(workspacePath: string): string {
  return `${workspacePath.trim().replace(/[/\\]+$/, "")}/assay.json`;
}

export function useAlignState(): Accessor<AlignState> {
  const workspace = useShellWorkspace();
  const [ui] = useAtom(() => alignerUiAtom);
  const [assayType, setAssayType] = createSignal<AssayType | null>(null);

  createEffect(() => {
    const path = workspace.workspacePath?.trim() ?? "";
    if (!path) {
      setAssayType(null);
      return;
    }
    const assayPath = workspaceAssayJsonPath(path);
    let cancelled = false;
    void runClientEffect(alignerClient.readTextFile(assayPath))
      .then((contents) => {
        if (cancelled) return;
        const decoded = decodeJsonResult(AssayJsonFileSchema)(contents);
        setAssayType(Result.isSuccess(decoded) ? decoded.success.type : null);
      })
      .catch(() => {
        if (!cancelled) setAssayType(null);
      });
    onCleanup(() => {
      cancelled = true;
    });
  });

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
    // Light shell: bbox/align only. Crop is Studio / lisca-crop / notebooks zip.
    enableCrop: false,
    assayDefaultTime: () => {
      const type = assayType();
      if (type == null) return null;
      return defaultStudioAlignTime(ui().scan?.times, studioAlignFrameDefault(type));
    },
  });
}
