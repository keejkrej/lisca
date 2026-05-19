import { AnnotationCanvas, ViewportCard, type AnnotationCanvasProps } from "@lisca/ui";

export function AnnotatorMain(props: AnnotationCanvasProps) {
  return (
    <ViewportCard>
      <AnnotationCanvas className="min-h-0 flex-1" {...props} />
    </ViewportCard>
  );
}
