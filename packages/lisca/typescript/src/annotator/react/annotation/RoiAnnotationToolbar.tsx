import { Button, cn, Slider } from "lisca/viewer/ui";
import { Settings } from "lucide-react";

import { SidebarField, SidebarSection } from "../../../viewer/react/app/sidebar";
import { colorStyle, maskHasPixels } from "./annotationUtils";
import { useRoiAnnotationContext } from "./RoiAnnotationContext";

export default function RoiAnnotationToolbar({ className }: { className?: string }) {
  const {
    title,
    subtitle,
    dirty,
    selectedClassificationLabel,
    localLabels,
    canManageLabels,
    loading,
    error,
    saveError,
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
    handleSave,
    saving,
    requestClose,
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
      <SidebarSection title="Annotation">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-medium text-foreground">{title}</h2>
            {dirty ? (
              <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200">
                Unsaved
              </span>
            ) : null}
            {selectedClassificationLabel ? (
              <span
                className="rounded-full border px-2.5 py-1 text-xs font-medium"
                style={colorStyle(selectedClassificationLabel.color, true)}
              >
                {selectedClassificationLabel.name}
              </span>
            ) : null}
          </div>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="rounded-2xl border border-border bg-muted/15 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">Label Set</span>
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Manage annotation labels"
              disabled={!canManageLabels}
              onClick={() => {
                setLabelSaveState({ saving: false, error: null });
                setLabelManagerOpen(true);
              }}
            >
              <Settings className="size-4" />
            </button>
          </div>
          {localLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {localLabels.map((label) => (
                <span
                  key={label.id}
                  className="rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={colorStyle(label.color, false)}
                >
                  {label.name}
                </span>
              ))}
              <span className="self-center text-xs text-muted-foreground">
                {localLabels.length} label{localLabels.length === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No labels yet</span>
          )}
        </div>
      </SidebarSection>

      <SidebarSection title="Status">
        {loading ? (
          <div className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
            Loading annotation...
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        ) : null}
        {!loading && !error && localLabels.length === 0 ? (
          <div className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            No annotation labels are available for this editor.
          </div>
        ) : null}
        {saveError ? (
          <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {saveError}
          </div>
        ) : null}
      </SidebarSection>

      <SidebarSection
        title="Classification"
        action={
          <span className="text-xs text-muted-foreground">
            {currentSnapshot.classificationLabelId ? "1 selected" : "Optional"}
          </span>
        }
      >
        <div className="flex flex-wrap gap-2">
          {localLabels.map((label) => {
            const active = currentSnapshot.classificationLabelId === label.id;
            return (
              <button
                key={label.id}
                type="button"
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit || loading}
            onClick={() => handleClassificationChange(null)}
          >
            Clear
          </button>
        </div>
      </SidebarSection>

      <SidebarSection
        title="Segmentation"
        action={
          <span className="text-xs text-muted-foreground">
            {maskHasPixels(effectiveMask) ? "Mask present" : "No mask"}
          </span>
        }
      >
        <SidebarField label="Paint label">
          <div className="flex flex-wrap gap-2">
            {localLabels.map((label) => {
              const active = activePaintLabelId === label.id;
              return (
                <button
                  key={label.id}
                  type="button"
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
            className="h-9 text-xs"
            disabled={!canEdit || loading}
            onClick={() => setTool("brush")}
          >
            Brush
          </Button>
          <Button
            size="sm"
            variant={tool === "erase" ? "default" : "outline"}
            className="h-9 text-xs"
            disabled={!canEdit || loading}
            onClick={() => setTool("erase")}
          >
            Erase
          </Button>
        </div>

        <SidebarField label="Brush size" hint={`${brushSize}px`}>
          <Slider
            value={brushSize}
            min={1}
            max={64}
            step={1}
            disabled={!canEdit || loading}
            onValueChange={(value) => setBrushSize(Math.round(value))}
          />
        </SidebarField>

        <SidebarField label="Overlay opacity" hint={overlayOpacity.toFixed(2)}>
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
          className="h-9 w-full text-xs"
          disabled={!canEdit || loading || !maskHasPixels(effectiveMask)}
          onClick={handleClearMask}
        >
          Clear mask
        </Button>
      </SidebarSection>

      <SidebarSection title="Shortcuts">
        <p className="text-xs text-muted-foreground">
          Paint on the frame with the active tool. Undo with Ctrl/Cmd+Z and redo with Ctrl/Cmd+Shift+Z.
        </p>
      </SidebarSection>

      <SidebarSection title="Actions">
        <p className="text-xs text-muted-foreground">
          {canEdit
            ? "Changes are stored only when you save."
            : "Saving is disabled until the annotation labels are available."}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            className="h-9 w-full text-xs"
            disabled={!canEdit || loading || saving || !dirty}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" className="h-9 w-full text-xs" onClick={requestClose}>
            Cancel
          </Button>
        </div>
      </SidebarSection>
    </aside>
  );
}
