import { AnnotationCanvas, ViewportCard, type AnnotationCanvasProps } from "@lisca/ui-native";

export function AnnotatorMain(props: AnnotationCanvasProps) {
  return (
    <ViewportCard>
      <AnnotationCanvas {...props} />
    </ViewportCard>
  );
}
