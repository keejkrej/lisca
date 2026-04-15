import { Button, cn, Slider } from "lisca/viewer/ui";

import { SidebarField, SidebarSection } from "../../../viewer/react/app/sidebar";
import { colorStyle, maskHasPixels } from "./annotationUtils";
import { useRoiAnnotationContext } from "./RoiAnnotationContext";

export default function RoiAnnotationToolbar({ className }: { className?: string }) {
  const {
    localLabels,
    labelManagerOpenable,
    loading,
    canEdit,
    currentSnapshot,
    effectiveMask,
    activePaintLabelId,
    setActivePaintLabelId,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    overlayOpacity,
    setOverlayOpacity,
    handleClassificationChange,
    handleClearMask,
    setLabelManagerOpen,
    setLabelSaveState,
  } = useRoiAnnotationContext();

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-y-auto divide-y divide-border border-l border-border bg-background px-5 py-4",
        className,
      )}
    >
      <SidebarSection
        title="Labels"
        action={
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            disabled={!labelManagerOpenable}
            title={!labelManagerOpenable ? "Open a workspace first" : undefined}
            onClick={() => {
              setLabelSaveState({ saving: false, error: null });
              setLabelManagerOpen(true);
            }}
          >
            Configure
          </Button>
        }
      >
        {localLabels.length > 0 ? (
          <div className="grid gap-2">
            {localLabels.map((label) => (
              <div
                key={label.id}
                className="flex items-center gap-2 rounded-lg border border-border/80 bg-card/50 px-3 py-2"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full border border-border/40 ring-1 ring-border/20"
                  style={{ backgroundColor: label.color }}
                />
                <span className="min-w-0 truncate text-xs font-medium text-foreground">
                  {label.name}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </SidebarSection>

      <SidebarSection
        title="Classify"
        action={
          <span className="text-[11px] text-muted-foreground">
            {currentSnapshot.classificationLabelId ? "Set" : "—"}
          </span>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {localLabels.map((label) => {
            const active = currentSnapshot.classificationLabelId === label.id;
            return (
              <button
                key={label.id}
                type="button"
                className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={colorStyle(label.color, active)}
                disabled={!canEdit || loading}
                onClick={() => handleClassificationChange(label.id)}
              >
                {label.name}
              </button>
            );
          })}
          <button
            type="button"
            className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit || loading}
            onClick={() => handleClassificationChange(null)}
          >
            None
          </button>
        </div>
      </SidebarSection>

      <SidebarSection
        title="Paint"
        action={
          <span className="text-[11px] text-muted-foreground">
            {maskHasPixels(effectiveMask) ? "Mask" : "—"}
          </span>
        }
      >
        <SidebarField label="With">
          <div className="flex flex-wrap gap-1.5">
            {localLabels.map((label) => {
              const active = activePaintLabelId === label.id;
              return (
                <button
                  key={label.id}
                  type="button"
                  className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={colorStyle(label.color, active)}
                  disabled={!canEdit || loading}
                  onClick={() => setActivePaintLabelId(label.id)}
                >
                  {label.name}
                </button>
              );
            })}
          </div>
        </SidebarField>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={tool === "brush" ? "default" : "outline"}
            className="h-8 text-xs"
            disabled={!canEdit || loading}
            onClick={() => setTool("brush")}
          >
            Brush
          </Button>
          <Button
            size="sm"
            variant={tool === "erase" ? "default" : "outline"}
            className="h-8 text-xs"
            disabled={!canEdit || loading}
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
            disabled={!canEdit || loading}
            onValueChange={(value) => setBrushSize(Math.round(value))}
          />
        </SidebarField>

        <SidebarField label="Opacity" hint={overlayOpacity.toFixed(2)}>
          <Slider
            value={overlayOpacity}
            min={0.05}
            max={0.95}
            step={0.01}
            disabled={!canEdit || loading}
            onValueChange={(value) => setOverlayOpacity(value)}
          />
        </SidebarField>

        <Button
          size="sm"
          variant="outline"
          className="h-8 w-full text-xs"
          disabled={!canEdit || loading || !maskHasPixels(effectiveMask)}
          onClick={handleClearMask}
        >
          Clear mask
        </Button>
      </SidebarSection>

    </aside>
  );
}
