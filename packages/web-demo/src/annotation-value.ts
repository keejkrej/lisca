import { createEmptyMask, masksEqual } from "@lisca/utils";
import type { FrameResult } from "@lisca/utils";

export type AnnotationValue = {
  classificationLabelId: string | null;
  mask: Uint8Array;
};

export function cloneAnnotationValue(value: AnnotationValue): AnnotationValue {
  return {
    classificationLabelId: value.classificationLabelId,
    mask: value.mask.slice(),
  };
}

export function annotationValuesEqual(left: AnnotationValue, right: AnnotationValue): boolean {
  return (
    left.classificationLabelId === right.classificationLabelId && masksEqual(left.mask, right.mask)
  );
}

export function emptyAnnotationValue(frame: FrameResult | null): AnnotationValue {
  return {
    classificationLabelId: null,
    mask: frame ? createEmptyMask(frame.width, frame.height) : new Uint8Array(),
  };
}
