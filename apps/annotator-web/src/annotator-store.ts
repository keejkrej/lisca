import type {
  AnnotationLabel,
  AnnotationMode,
  ContrastWindow,
  FrameResult,
  RoiIndexEntry,
  RoiPositionScan,
  RoiWorkspaceScan,
} from "@lisca/contracts";
import { create } from "zustand";

import type { AnnotationTool } from "./annotation-canvas";

export type RoiSelection = {
  pos: number | null;
  roi: number | null;
  channel: number | null;
  timeIndex: number;
  zIndex: number;
};

type AnnotatorStoreState = {
  workspacePath: string | null;
  scan: RoiWorkspaceScan | null;
  labels: AnnotationLabel[];
  selection: RoiSelection;
  activeLabelId: string | null;
  mode: AnnotationMode;
  tool: AnnotationTool;
  brushSize: number;
  overlayOpacity: number;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  contrastDomain: ContrastWindow;
  contrastMin: number;
  contrastMax: number;
  scanLoading: boolean;
  frameLoading: boolean;
  annotationLoading: boolean;
  saving: boolean;
  scanError: string | null;
  frameError: string | null;
  annotationError: string | null;
  saveError: string | null;
  labelError: string | null;
  status: string | null;
  labelDialogOpen: boolean;
};

type AnnotatorStoreActions = {
  setWorkspacePath: (workspacePath: string | null) => void;
  setScan: (scan: RoiWorkspaceScan | null) => void;
  setLabels: (labels: AnnotationLabel[]) => void;
  setSelection: (patch: Partial<RoiSelection>) => void;
  setActiveLabelId: (activeLabelId: string | null) => void;
  setMode: (mode: AnnotationMode) => void;
  setTool: (tool: AnnotationTool) => void;
  setBrushSize: (brushSize: number) => void;
  setOverlayOpacity: (overlayOpacity: number) => void;
  setFrame: (frame: FrameResult | null) => void;
  setContrast: (contrast: ContrastWindow | null) => void;
  setContrastState: (frame: FrameResult) => void;
  setScanLoading: (scanLoading: boolean) => void;
  setFrameLoading: (frameLoading: boolean) => void;
  setAnnotationLoading: (annotationLoading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setScanError: (scanError: string | null) => void;
  setFrameError: (frameError: string | null) => void;
  setAnnotationError: (annotationError: string | null) => void;
  setSaveError: (saveError: string | null) => void;
  setLabelError: (labelError: string | null) => void;
  setStatus: (status: string | null) => void;
  setLabelDialogOpen: (labelDialogOpen: boolean) => void;
};

export type AnnotatorStore = AnnotatorStoreState & AnnotatorStoreActions;

const defaultSelection: RoiSelection = {
  pos: null,
  roi: null,
  channel: null,
  timeIndex: 0,
  zIndex: 0,
};

const defaultContrastDomain: ContrastWindow = { min: 0, max: 255 };

function createInitialState(): AnnotatorStoreState {
  return {
    workspacePath: null,
    scan: null,
    labels: [],
    selection: defaultSelection,
    activeLabelId: null,
    mode: "classification",
    tool: "brush",
    brushSize: 4,
    overlayOpacity: 0.35,
    frame: null,
    contrast: null,
    contrastDomain: defaultContrastDomain,
    contrastMin: 0,
    contrastMax: 255,
    scanLoading: false,
    frameLoading: false,
    annotationLoading: false,
    saving: false,
    scanError: null,
    frameError: null,
    annotationError: null,
    saveError: null,
    labelError: null,
    status: null,
    labelDialogOpen: false,
  };
}

export function currentPosition(scan: RoiWorkspaceScan | null, pos: number | null) {
  if (!scan || pos == null) return null;
  return scan.positions.find((entry) => entry.pos === pos) ?? null;
}

export function currentRoi(position: RoiPositionScan | null, roi: number | null) {
  if (!position || roi == null) return null;
  return position.rois.find((entry) => entry.roi === roi) ?? null;
}

export function roiRequestSelectionKey(selection: RoiSelection): string {
  return [
    selection.pos ?? "none",
    selection.roi ?? "none",
    selection.channel ?? "none",
    selection.timeIndex,
    selection.zIndex,
  ].join(":");
}

export function requestKey(
  position: RoiPositionScan | null,
  roi: RoiIndexEntry | null,
  selection: RoiSelection,
) {
  const time = position?.times[selection.timeIndex];
  const z = position?.zSlices[selection.zIndex];
  if (!position || !roi || selection.channel == null || time == null || z == null) return "none";
  return `${position.pos}:${roi.roi}:${selection.channel}:${time}:${z}`;
}

export const useAnnotatorStore = create<AnnotatorStore>((set) => ({
  ...createInitialState(),
  setWorkspacePath: (workspacePath) =>
    set((state) => {
      if (state.workspacePath === workspacePath) return state;
      return {
        ...state,
        workspacePath,
        scan: null,
        labels: [],
        selection: defaultSelection,
        activeLabelId: null,
        frame: null,
        contrast: null,
        contrastDomain: defaultContrastDomain,
        contrastMin: 0,
        contrastMax: 255,
        scanError: null,
        frameError: null,
        annotationError: null,
        saveError: null,
        labelError: null,
        status: null,
      };
    }),
  setScan: (scan) => set((state) => ({ ...state, scan })),
  setLabels: (labels) =>
    set((state) => ({
      ...state,
      labels,
      activeLabelId:
        state.activeLabelId && labels.some((label) => label.id === state.activeLabelId)
          ? state.activeLabelId
          : (labels[0]?.id ?? null),
    })),
  setSelection: (patch) =>
    set((state) => ({ ...state, selection: { ...state.selection, ...patch } })),
  setActiveLabelId: (activeLabelId) => set((state) => ({ ...state, activeLabelId })),
  setMode: (mode) => set((state) => ({ ...state, mode })),
  setTool: (tool) => set((state) => ({ ...state, tool })),
  setBrushSize: (brushSize) => set((state) => ({ ...state, brushSize })),
  setOverlayOpacity: (overlayOpacity) => set((state) => ({ ...state, overlayOpacity })),
  setFrame: (frame) => set((state) => ({ ...state, frame })),
  setContrast: (contrast) =>
    set((state) => ({
      ...state,
      contrast,
      contrastMin: contrast?.min ?? state.contrastMin,
      contrastMax: contrast?.max ?? state.contrastMax,
    })),
  setContrastState: (frame) =>
    set((state) => ({
      ...state,
      contrastDomain: frame.contrastDomain ?? defaultContrastDomain,
      contrastMin: frame.appliedContrast?.min ?? state.contrastMin,
      contrastMax: frame.appliedContrast?.max ?? state.contrastMax,
    })),
  setScanLoading: (scanLoading) => set((state) => ({ ...state, scanLoading })),
  setFrameLoading: (frameLoading) => set((state) => ({ ...state, frameLoading })),
  setAnnotationLoading: (annotationLoading) => set((state) => ({ ...state, annotationLoading })),
  setSaving: (saving) => set((state) => ({ ...state, saving })),
  setScanError: (scanError) => set((state) => ({ ...state, scanError })),
  setFrameError: (frameError) => set((state) => ({ ...state, frameError })),
  setAnnotationError: (annotationError) => set((state) => ({ ...state, annotationError })),
  setSaveError: (saveError) => set((state) => ({ ...state, saveError })),
  setLabelError: (labelError) => set((state) => ({ ...state, labelError })),
  setStatus: (status) => set((state) => ({ ...state, status })),
  setLabelDialogOpen: (labelDialogOpen) => set((state) => ({ ...state, labelDialogOpen })),
}));
