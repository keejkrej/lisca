import { Button, cn } from "@lisca/ui/components";
import { AnnotationModeToggle, AnnotationToolSlider } from "@lisca/ui/features";
import { SidebarSection, SidebarStack } from "@lisca/ui/shell";
import { createEmptyMask, labelColorStyle } from "@lisca/utils";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { useStudioAnnotateLabels } from "../state/studio-annotate-page-selectors";

export function StudioAnnotateRight() {
  const { state } = useStudioAnnotatePage();
  const labels = useStudioAnnotateLabels();
  const activeError =
    labels.scanError ?? labels.frameError ?? labels.annotationError ?? labels.saveError;
  const loading = labels.scanLoading || labels.frameLoading || labels.annotationLoading;

  if (state.workspaceMissing) {
    return (
      <SidebarStack>
        <SidebarSection title="Annotate">
          <p className="text-muted-foreground text-sm">Complete Basic info to annotate ROIs.</p>
        </SidebarSection>
      </SidebarStack>
    );
  }

  return (
    <SidebarStack>
      <SidebarSection title="Mode">
        <AnnotationModeToggle className="w-full" mode={labels.mode} onModeChange={labels.setMode} />
      </SidebarSection>
      <SidebarSection contentClassName="grid grid-cols-2 gap-2" title="Labels">
        {labels.labels.map((label) => {
          const selected =
            labels.mode === "classification"
              ? labels.annotation.current.classificationLabelId === label.id
              : labels.activeLabelId === label.id;
          return (
            <button
              key={label.id}
              className={cn(
                "min-w-0 truncate rounded-md border px-2 py-2 text-center text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50",
              )}
              disabled={!labels.canEdit}
              style={labelColorStyle(label, selected)}
              type="button"
              title={label.name}
              onClick={() => {
                if (labels.mode === "classification") {
                  labels.annotation.commit({
                    classificationLabelId: selected ? null : label.id,
                    mask: labels.annotation.current.mask,
                  });
                } else {
                  labels.setActiveLabelId(label.id);
                }
              }}
            >
              {label.name}
            </button>
          );
        })}
        {labels.labels.length === 0 ? (
          <Button
            className="col-span-2 w-full"
            disabled={!labels.workspacePath}
            size="sm"
            type="button"
            variant="outline"
            onClick={labels.openLabelDialog}
          >
            Add
          </Button>
        ) : (
          <Button
            className="col-span-2 w-full"
            disabled={!labels.workspacePath}
            size="sm"
            type="button"
            variant="outline"
            onClick={labels.openLabelDialog}
          >
            Edit labels
          </Button>
        )}
        {loading ? <p className="col-span-2 text-muted-foreground text-xs">Loading…</p> : null}
        {activeError ? <p className="col-span-2 text-destructive text-xs">{activeError}</p> : null}
      </SidebarSection>
      <SidebarSection contentClassName="grid grid-cols-2 gap-2" title="Edit">
        <Button
          disabled={!labels.annotation.canUndo}
          size="sm"
          type="button"
          variant="outline"
          onClick={labels.annotation.undo}
        >
          Undo
        </Button>
        <Button
          disabled={!labels.annotation.canRedo}
          size="sm"
          type="button"
          variant="outline"
          onClick={labels.annotation.redo}
        >
          Redo
        </Button>
        <Button
          disabled={labels.mode !== "segmentation" || !labels.canEdit}
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            labels.frame &&
            labels.annotation.commit({
              classificationLabelId: labels.annotation.current.classificationLabelId,
              mask: createEmptyMask(labels.frame.width, labels.frame.height),
            })
          }
        >
          Clear
        </Button>
        <Button
          disabled={!labels.annotation.dirty}
          size="sm"
          type="button"
          variant="outline"
          onClick={labels.annotation.discard}
        >
          Discard
        </Button>
      </SidebarSection>
      {labels.mode === "segmentation" ? (
        <SidebarSection contentClassName="flex flex-col gap-3" title="Brush">
          <AnnotationToolSlider
            label="Opacity"
            max={0.95}
            min={0.05}
            step={0.01}
            value={labels.overlayOpacity}
            valueLabel={`${Math.round(labels.overlayOpacity * 100)}%`}
            onChange={labels.setOverlayOpacity}
          />
          <AnnotationToolSlider
            label="Brush Size"
            max={32}
            min={1}
            step={1}
            value={labels.brushSize}
            valueLabel={String(Math.round(labels.brushSize))}
            onChange={(value) => labels.setBrushSize(Math.round(value))}
          />
        </SidebarSection>
      ) : null}
    </SidebarStack>
  );
}
