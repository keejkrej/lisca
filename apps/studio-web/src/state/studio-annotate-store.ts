import type {
  AnalysisProgress,
  ContrastWindow,
  FrameResult,
  RoiIndexEntry,
  RoiPositionScan,
  RoiWorkspaceScan,
  StudioAnalysisCsvFile,
} from "@lisca/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type StudioAnnotateSelection = {
  pos: number | null;
  roi: number | null;
  channel: number | null;
  timeIndex: number;
  zIndex: number;
};

type StudioAnnotateStoreState = {
  analysisStartConfirm: boolean;
  analysisRequestId: string | null;
  analysisProgress: AnalysisProgress | null;
  analysisResultFiles: StudioAnalysisCsvFile[];
  workspacePath: string | null;
  scan: RoiWorkspaceScan | null;
  selection: StudioAnnotateSelection;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  contrastDomain: ContrastWindow;
  contrastMin: number;
  contrastMax: number;
  scanLoading: boolean;
  frameLoading: boolean;
  scanError: string | null;
  frameError: string | null;
  status: string | null;
};

type StudioAnnotateStoreActions = {
  setWorkspacePath: (workspacePath: string | null) => void;
  setAnalysisStartConfirm: (value: boolean) => void;
  setAnalysisRequestId: (requestId: string | null) => void;
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setAnalysisResultFiles: (files: StudioAnalysisCsvFile[]) => void;
  setScan: (scan: RoiWorkspaceScan | null) => void;
  setSelection: (patch: Partial<StudioAnnotateSelection>) => void;
  setFrame: (frame: FrameResult | null) => void;
  setContrast: (contrast: ContrastWindow | null) => void;
  setContrastState: (frame: FrameResult) => void;
  setScanLoading: (scanLoading: boolean) => void;
  setFrameLoading: (frameLoading: boolean) => void;
  setScanError: (scanError: string | null) => void;
  setFrameError: (frameError: string | null) => void;
  setStatus: (status: string | null) => void;
};

export type StudioAnnotateStore = StudioAnnotateStoreState & StudioAnnotateStoreActions;

const defaultSelection: StudioAnnotateSelection = {
  pos: null,
  roi: null,
  channel: null,
  timeIndex: 0,
  zIndex: 0,
};
const defaultContrastDomain: ContrastWindow = { min: 0, max: 255 };

function createInitialState(): StudioAnnotateStoreState {
  return {
    analysisStartConfirm: false,
    analysisRequestId: null,
    analysisProgress: null,
    analysisResultFiles: [],
    workspacePath: null,
    scan: null,
    selection: defaultSelection,
    frame: null,
    contrast: null,
    contrastDomain: defaultContrastDomain,
    contrastMin: 0,
    contrastMax: 255,
    scanLoading: false,
    frameLoading: false,
    scanError: null,
    frameError: null,
    status: null,
  };
}

export function currentAnnotatePosition(scan: RoiWorkspaceScan | null, pos: number | null) {
  if (!scan || pos == null) return null;
  return scan.positions.find((entry) => entry.pos === pos) ?? null;
}

export function currentAnnotateRoi(position: RoiPositionScan | null, roi: number | null) {
  if (!position || roi == null) return null;
  return position.rois.find((entry) => entry.roi === roi) ?? null;
}

export function annotateRequestKey(
  position: RoiPositionScan | null,
  roi: RoiIndexEntry | null,
  selection: StudioAnnotateSelection,
) {
  const time = position?.times[selection.timeIndex];
  const z = position?.zSlices[selection.zIndex];
  if (!position || !roi || selection.channel == null || time == null || z == null) return "none";
  return `${position.pos}:${roi.roi}:${selection.channel}:${time}:${z}`;
}

export const useStudioAnnotateStore = create<StudioAnnotateStore>()(
  persist(
    (set) => ({
      ...createInitialState(),
      setWorkspacePath: (workspacePath) =>
        set((state) => {
          if (state.workspacePath === workspacePath) return state;
          return {
            ...state,
            workspacePath,
            analysisStartConfirm: false,
            analysisRequestId: null,
            analysisProgress: null,
            analysisResultFiles: [],
            scan: null,
            selection: defaultSelection,
            frame: null,
            contrast: null,
            contrastDomain: defaultContrastDomain,
            contrastMin: 0,
            contrastMax: 255,
            scanError: null,
            frameError: null,
            status: null,
          };
        }),
      setAnalysisStartConfirm: (analysisStartConfirm) =>
        set((state) => ({ ...state, analysisStartConfirm })),
      setAnalysisRequestId: (analysisRequestId) =>
        set((state) => ({ ...state, analysisRequestId })),
      setAnalysisProgress: (analysisProgress) =>
        set((state) => ({ ...state, analysisProgress })),
      setAnalysisResultFiles: (analysisResultFiles) =>
        set((state) => ({ ...state, analysisResultFiles })),
      setScan: (scan) => set((state) => ({ ...state, scan })),
      setSelection: (patch) =>
        set((state) => ({ ...state, selection: { ...state.selection, ...patch } })),
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
      setScanError: (scanError) => set((state) => ({ ...state, scanError })),
      setFrameError: (frameError) => set((state) => ({ ...state, frameError })),
      setStatus: (status) => set((state) => ({ ...state, status })),
    }),
    {
      name: "lisca-studio-annotate-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        workspacePath: state.workspacePath,
        selection: state.selection,
      }),
    },
  ),
);
