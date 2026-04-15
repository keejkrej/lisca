import { Button, Slider } from "lisca/viewer/ui";

import { SidebarField, SidebarSection } from "../../../../viewer/react/app/sidebar";
import { maskHasPixels } from "../annotationUtils";
import { useRoiAnnotationContext } from "../RoiAnnotationContext";

export default function AnnotationToolbarPaint() {
  const {
    loading,
    canEditPaint,
    effectiveMask,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    overlayOpacity,
    setOverlayOpacity,
    handleClearMask,
  } = useRoiAnnotationContext();

  return (
    <SidebarSection title="Paint">
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant={tool === "brush" ? "default" : "outline"}
          className="h-8 text-xs"
          disabled={!canEditPaint || loading}
          onClick={() => setTool("brush")}
        >
          Brush
        </Button>
        <Button
          size="sm"
          variant={tool === "erase" ? "default" : "outline"}
          className="h-8 text-xs"
          disabled={!canEditPaint || loading}
          onClick={() => setTool("erase")}
        >
          Erase
        </Button>
      </div>

      <SidebarField label="Size" hint={`${brushSize}px`}>
        <Slider
          value={brushSize}
          min={1}
          max={64}
          step={1}
          disabled={!canEditPaint || loading}
          onValueChange={(value) => setBrushSize(Math.round(value))}
        />
      </SidebarField>

      <SidebarField label="Opacity" hint={overlayOpacity.toFixed(2)}>
        <Slider
          value={overlayOpacity}
          min={0.05}
          max={0.95}
          step={0.01}
          disabled={!canEditPaint || loading}
          onValueChange={(value) => setOverlayOpacity(value)}
        />
      </SidebarField>

      <Button
        size="sm"
        variant="outline"
        className="h-8 w-full text-xs"
        disabled={!canEditPaint || loading || !maskHasPixels(effectiveMask)}
        onClick={handleClearMask}
      >
        Clear mask
      </Button>
    </SidebarSection>
  );
}
