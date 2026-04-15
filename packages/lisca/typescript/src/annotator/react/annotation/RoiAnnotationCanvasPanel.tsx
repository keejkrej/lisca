import RoiAnnotationCanvas from "./RoiAnnotationCanvas";
import { useRoiAnnotationContext } from "./RoiAnnotationContext";

export default function RoiAnnotationCanvasPanel({ className }: { className?: string }) {
  const {
    frame,
    localLabels,
    effectiveMask,
    activePaintLabelId,
    tool,
    brushSize,
    overlayOpacity,
    canEditPaint,
    loading,
    setPreviewMask,
    clearStrokeError,
    commitStroke,
  } = useRoiAnnotationContext();

  return (
    <div
      className={`relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background p-4 ${className ?? ""}`}
    >
      <RoiAnnotationCanvas
        frame={frame}
        labels={localLabels}
        mask={effectiveMask}
        activeLabelId={activePaintLabelId}
        tool={tool}
        brushSize={brushSize}
        overlayOpacity={overlayOpacity}
        disabled={!canEditPaint || loading}
        className="h-full min-h-[20rem] w-full"
        onStrokeStart={clearStrokeError}
        onPreviewMaskChange={setPreviewMask}
        onStrokeCommit={commitStroke}
      />
    </div>
  );
}
