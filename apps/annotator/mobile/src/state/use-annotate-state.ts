import { useAnnotateStateCore } from "@lisca/client/use-annotate-state-core";
import {
  useCanvasResourceTransaction,
  useCanvasTransientStatus,
  useShellWorkspace,
} from "@lisca/ui-native";

import { annotatorClient, toErrorMessage } from "../api/annotator-port";
import {
  annotationLabelsAtom,
  labelsIdleAtom,
  roiScanIdleAtom,
  roiWorkspaceScanAtom,
  saveAnnotationLabelsAtom,
  saveRoiFrameAnnotationAtom,
} from "../atoms/annotator-query-atoms";
import {
  annotatorUiActions,
  annotatorUiAtom,
  currentRoi,
  requestKey,
  roiRequestSelectionKey,
} from "../atoms/annotator-ui-atoms";
import { effectErrorMessage, loadRoiFrameWithAnnotationEffect } from "../effects/roi-loader";
import { emptyValueFor, useAnnotationHistory } from "./use-annotation-history";
import { makeRequest } from "../utils/roi-request";
import { encodeMaskToBase64Png, maskHasPixels } from "../utils/annotation-utils";

export function useAnnotateState() {
  return useAnnotateStateCore({
    annotatorClient,
    toErrorMessage,
    effectErrorMessage,
    loadRoiFrameWithAnnotationEffect,
    annotatorUiAtom,
    annotatorUiActions,
    roiWorkspaceScanAtom,
    roiScanIdleAtom,
    annotationLabelsAtom,
    labelsIdleAtom,
    saveAnnotationLabelsAtom,
    saveRoiFrameAnnotationAtom,
    useShellWorkspace,
    useCanvasResourceTransaction,
    useCanvasTransientStatus,
    guardDirtySelection: () => true,
    useAnnotationHistory,
    emptyValueFor,
    makeRequest,
    currentRoi,
    requestKey,
    roiRequestSelectionKey,
    encodeMaskToBase64Png,
    maskHasPixels,
  });
}
