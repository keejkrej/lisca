import { useEffect, useState } from "react";

import type { RoiFrameRequest, RawFrameRequest, ViewerDataPort, ViewerSource } from "lisca/shared/contracts";
import { toErrorMessage } from "lisca/shared/react";

import { createEmptyMask, decodeMaskBase64Png, type RoiAnnotationValue } from "../annotation";

export interface FrameAnnotationEditorLoadState {
  loading: boolean;
  error: string | null;
}

export interface UseLoadFrameAnnotationForEditorArgs {
  annotationLoadEnabled: boolean;
  workspacePath: string;
  backend: ViewerDataPort;
  frameWidth: number;
  frameHeight: number;
  mode: "roi" | "raw";
  roiRequest: RoiFrameRequest | null;
  rawRequest: RawFrameRequest | null;
  rawSource: ViewerSource | null;
}

/**
 * Loads persisted annotation + mask for the ROI or raw editor (full IPC payload, not TanStack Query).
 */
export function useLoadFrameAnnotationForEditor({
  annotationLoadEnabled,
  workspacePath,
  backend,
  frameWidth,
  frameHeight,
  mode,
  roiRequest,
  rawRequest,
  rawSource,
}: UseLoadFrameAnnotationForEditorArgs) {
  const [initialValue, setInitialValue] = useState<RoiAnnotationValue>(() => ({
    classificationLabelId: null,
    mask: createEmptyMask(frameWidth, frameHeight),
  }));
  const [resetKey, setResetKey] = useState(0);
  const [loadState, setLoadState] = useState<FrameAnnotationEditorLoadState>(() => ({
    loading: annotationLoadEnabled,
    error: null,
  }));

  useEffect(() => {
    if (!annotationLoadEnabled) {
      setLoadState({ loading: false, error: null });
      setInitialValue({
        classificationLabelId: null,
        mask: createEmptyMask(frameWidth, frameHeight),
      });
      setResetKey((current) => current + 1);
      return;
    }

    let cancelled = false;
    setLoadState({ loading: true, error: null });

    void (async () => {
      try {
        if (mode === "roi") {
          if (!roiRequest) {
            throw new Error("ROI annotation load: missing request");
          }
          const loaded = await backend.loadRoiFrameAnnotation(workspacePath, roiRequest);
          const mask = loaded.maskBase64Png
            ? await decodeMaskBase64Png(loaded.maskBase64Png, frameWidth, frameHeight)
            : createEmptyMask(frameWidth, frameHeight);
          if (cancelled) return;
          setInitialValue({
            classificationLabelId: loaded.annotation.classificationLabelId ?? null,
            mask,
          });
        } else {
          if (!rawRequest || !rawSource) {
            throw new Error("Raw annotation load: missing request or source");
          }
          const loaded = await backend.loadRawFrameAnnotation(workspacePath, rawSource, rawRequest);
          const mask = loaded.maskBase64Png
            ? await decodeMaskBase64Png(loaded.maskBase64Png, frameWidth, frameHeight)
            : createEmptyMask(frameWidth, frameHeight);
          if (cancelled) return;
          setInitialValue({
            classificationLabelId: loaded.annotation.classificationLabelId ?? null,
            mask,
          });
        }
        setResetKey((current) => current + 1);
        setLoadState({ loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setInitialValue({
          classificationLabelId: null,
          mask: createEmptyMask(frameWidth, frameHeight),
        });
        setResetKey((current) => current + 1);
        setLoadState({ loading: false, error: toErrorMessage(error) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    annotationLoadEnabled,
    backend,
    frameHeight,
    frameWidth,
    mode,
    rawRequest,
    rawSource,
    roiRequest,
    workspacePath,
  ]);

  return { initialValue, resetKey, loadState };
}
