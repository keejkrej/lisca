import { useAnnotateStateCore } from "@lisca/client/use-annotate-state-core";
import { useCanvasResourceTransaction, useCanvasTransientStatus } from "@lisca/ui/features";
import { useShellWorkspace } from "@lisca/ui/shell";

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
import {
  effectErrorMessage,
  loadRoiFrameEffect,
  loadRoiFrameWithAnnotationEffect,
} from "../effects/roi-loader";
import { emptyValueFor, useAnnotationHistory } from "./use-annotation-history";
import { makeRequest } from "../utils/roi-request";
import { encodeMaskToBase64Png, maskHasPixels } from "../utils/annotation-utils";

export type AnnotateState = ReturnType<ReturnType<typeof useAnnotateStateCore>>;

export function useAnnotateState(): AnnotateState {
  const annotate = useAnnotateStateCore({
    annotatorClient,
    toErrorMessage,
    effectErrorMessage,
    loadRoiFrameWithAnnotationEffect,
    loadRoiFrameEffect,
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
    useCanvasTransientStatus: (status) => useCanvasTransientStatus(status),
    guardDirtySelection: (dirty, selectionChanging) => {
      if (!dirty || selectionChanging) return true;
      return window.confirm("Discard unsaved annotation changes?");
    },
    useAnnotationHistory,
    emptyValueFor,
    makeRequest,
    currentRoi,
    requestKey,
    roiRequestSelectionKey,
    encodeMaskToBase64Png,
    maskHasPixels,
  });

  return {
    get workspacePath() {
      return annotate().workspacePath;
    },
    get scan() {
      return annotate().scan;
    },
    get labels() {
      return annotate().labels;
    },
    get selection() {
      return annotate().selection;
    },
    get activeLabelId() {
      return annotate().activeLabelId;
    },
    get mode() {
      return annotate().mode;
    },
    get tool() {
      return annotate().tool;
    },
    get brushSize() {
      return annotate().brushSize;
    },
    get overlayOpacity() {
      return annotate().overlayOpacity;
    },
    get frame() {
      return annotate().frame;
    },
    get contrast() {
      return annotate().contrast;
    },
    get contrastDomain() {
      return annotate().contrastDomain;
    },
    get contrastMin() {
      return annotate().contrastMin;
    },
    get contrastMax() {
      return annotate().contrastMax;
    },
    get scanLoading() {
      return annotate().scanLoading;
    },
    get frameLoading() {
      return annotate().frameLoading;
    },
    get annotationLoading() {
      return annotate().annotationLoading;
    },
    get saving() {
      return annotate().saving;
    },
    get scanError() {
      return annotate().scanError;
    },
    get frameError() {
      return annotate().frameError;
    },
    get annotationError() {
      return annotate().annotationError;
    },
    get saveError() {
      return annotate().saveError;
    },
    get labelError() {
      return annotate().labelError;
    },
    get labelDialogOpen() {
      return annotate().labelDialogOpen;
    },
    get filePickerOpen() {
      return annotate().filePickerOpen;
    },
    get position() {
      return annotate().position;
    },
    get request() {
      return annotate().request;
    },
    get annotation() {
      return annotate().annotation;
    },
    get canEdit() {
      return annotate().canEdit;
    },
    get canEditSegmentation() {
      return annotate().canEditSegmentation;
    },
    get canSave() {
      return annotate().canSave;
    },
    get canvasToasts() {
      return annotate().canvasToasts;
    },
    get setFilePickerOpen() {
      return annotate().setFilePickerOpen;
    },
    get setLabelDialogOpen() {
      return annotate().setLabelDialogOpen;
    },
    get setLabelError() {
      return annotate().setLabelError;
    },
    get setSelection() {
      return annotate().setSelection;
    },
    get setContrast() {
      return annotate().setContrast;
    },
    get setMode() {
      return annotate().setMode;
    },
    get setTool() {
      return annotate().setTool;
    },
    get setBrushSize() {
      return annotate().setBrushSize;
    },
    get setOverlayOpacity() {
      return annotate().setOverlayOpacity;
    },
    get setActiveLabelId() {
      return annotate().setActiveLabelId;
    },
    get changeSelection() {
      return annotate().changeSelection;
    },
    get handleSave() {
      return annotate().handleSave;
    },
    get handleSaveLabels() {
      return annotate().handleSaveLabels;
    },
    get saveLabelsPending() {
      return annotate().saveLabelsPending;
    },
    get pickWorkspace() {
      return annotate().pickWorkspace;
    },
  };
}