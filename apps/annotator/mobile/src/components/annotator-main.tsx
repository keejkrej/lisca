import { AnnotationCanvas, ViewportCard, type AnnotationCanvasProps } from "@lisca/ui-native";
type AnnotatorMainProps = Omit<AnnotationCanvasProps, "onMaskCommit"> & {
  classificationLabelId: string | null;
  commitAnnotation: (value: { classificationLabelId: string | null; mask: Uint8Array }) => void;
};
export function AnnotatorMain({
  classificationLabelId,
  commitAnnotation,
  ...canvasProps
}: AnnotatorMainProps) {
  const onMaskCommit = (mask: Uint8Array) => {
    commitAnnotation({
      classificationLabelId,
      mask,
    });
  };
  return (
    <ViewportCard>
      <AnnotationCanvas {...canvasProps} onMaskCommit={onMaskCommit} />
    </ViewportCard>
  );
}
