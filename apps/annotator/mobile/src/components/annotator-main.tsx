import { AnnotationCanvas, ViewportCard, type AnnotationCanvasProps } from "@lisca/ui-native";
import { useCallback } from "react";

type AnnotatorMainProps = Omit<AnnotationCanvasProps, "onMaskCommit"> & {
  classificationLabelId: string | null;
  commitAnnotation: (value: {
    classificationLabelId: string | null;
    mask: Uint8Array;
  }) => void;
};

export function AnnotatorMain({
  classificationLabelId,
  commitAnnotation,
  ...canvasProps
}: AnnotatorMainProps) {
  const onMaskCommit = useCallback(
    (mask: Uint8Array) => {
      commitAnnotation({ classificationLabelId, mask });
    },
    [classificationLabelId, commitAnnotation],
  );

  return (
    <ViewportCard>
      <AnnotationCanvas {...canvasProps} onMaskCommit={onMaskCommit} />
    </ViewportCard>
  );
}
