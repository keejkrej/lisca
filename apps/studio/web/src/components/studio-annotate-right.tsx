import { Button, cn } from "@lisca/ui/components";
import { AnnotationModeToggle, AnnotationToolSlider } from "@lisca/ui/features";
import { SidebarSection, SidebarStack } from "@lisca/ui/shell";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { createEmptyMask, labelColorStyle } from "../utils/annotation-utils";

export function StudioAnnotateRight() {
  const { state } = useStudioAnnotatePage();
  const activeError =
    state.scanError ?? state.frameError ?? state.annotationError ?? state.saveError;
  const loading = state.scanLoading || state.frameLoading || state.annotationLoading;

  const openCreateLabels = () => {
    state.setLabelError(null);
    state.setLabelDialogOpen(true);
  };

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
        <AnnotationModeToggle className="w-full" mode={state.mode} onModeChange={state.setMode} />
      </SidebarSection>
      <SidebarSection contentClassName="grid grid-cols-2 gap-2" title="Labels">
        {state.labels.map((label) => {
          const selected =
            state.mode === "classification"
              ? state.annotation.current.classificationLabelId === label.id
              : state.activeLabelId === label.id;
          return (
            <button
              key={label.id}
              className={cn(
                "min-w-0 truncate rounded-md border px-2 py-2 text-center text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50",
              )}
              disabled={!state.canEdit}
              style={labelColorStyle(label, selected)}
              type="button"
              title={label.name}
              onClick={() => {
                if (state.mode === "classification") {
                  state.annotation.commit({
                    classificationLabelId: selected ? null : label.id,
                    mask: state.annotation.current.mask,
                  });
                } else {
                  state.setActiveLabelId(label.id);
                }
              }}
            >
              {label.name}
            </button>
          );
        })}
        {state.labels.length === 0 ? (
          <Button
            className="col-span-2 w-full"
            disabled={!state.workspacePath}
            size="sm"
            type="button"
            variant="outline"
            onClick={openCreateLabels}
          >
            Add
          </Button>
        ) : null}
        {loading ? <p className="col-span-2 text-muted-foreground text-xs">Loading…</p> : null}
        {activeError ? <p className="col-span-2 text-destructive text-xs">{activeError}</p> : null}
      </SidebarSection>
      <SidebarSection contentClassName="grid grid-cols-2 gap-2" title="Edit">
        <Button
          disabled={!state.annotation.canUndo}
          size="sm"
          type="button"
          variant="outline"
          onClick={state.annotation.undo}
        >
          Undo
        </Button>
        <Button
          disabled={!state.annotation.canRedo}
          size="sm"
          type="button"
          variant="outline"
          onClick={state.annotation.redo}
        >
          Redo
        </Button>
        <Button
          disabled={state.mode !== "segmentation" || !state.canEdit}
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            state.frame &&
            state.annotation.commit({
              classificationLabelId: state.annotation.current.classificationLabelId,
              mask: createEmptyMask(state.frame.width, state.frame.height),
            })
          }
        >
          Clear
        </Button>
        <Button
          disabled={!state.annotation.dirty}
          size="sm"
          type="button"
          variant="outline"
          onClick={state.annotation.discard}
        >
          Discard
        </Button>
      </SidebarSection>
      {state.mode === "segmentation" ? (
        <SidebarSection contentClassName="flex flex-col gap-3" title="Brush">
          <AnnotationToolSlider
            label="Opacity"
            max={0.95}
            min={0.05}
            step={0.01}
            value={state.overlayOpacity}
            valueLabel={`${Math.round(state.overlayOpacity * 100)}%`}
            onChange={state.setOverlayOpacity}
          />
          <AnnotationToolSlider
            label="Brush Size"
            max={32}
            min={1}
            step={1}
            value={state.brushSize}
            valueLabel={String(Math.round(state.brushSize))}
            onChange={(value) => state.setBrushSize(Math.round(value))}
          />
        </SidebarSection>
      ) : null}
    </SidebarStack>
  );
}
