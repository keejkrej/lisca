import { Button, cn } from "@lisca/ui";
import { AnnotationModeToggle, AnnotationToolSlider } from "@lisca/ui/features";
import { Section } from "@lisca/ui/shell";
import { useRoiPage } from "../state/roi-page-context";
import { createEmptyMask, labelColorStyle } from "../utils/annotation-utils";

export function AnnotatorRight() {
  const { page } = useRoiPage();
  const activeError =
    page.scanError ?? page.frameError ?? page.annotationError ?? page.saveError;
  const loading = page.scanLoading || page.frameLoading || page.annotationLoading;

  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
      <Section title="Mode">
        <AnnotationModeToggle className="w-full" mode={page.mode} onModeChange={page.setMode} />
      </Section>
      <Section title="Labels" contentClassName="grid grid-cols-2 gap-2">
        {page.labels.map((label) => {
          const selected =
            page.mode === "classification"
              ? page.annotation.current.classificationLabelId === label.id
              : page.activeLabelId === label.id;
          return (
            <button
              key={label.id}
              className={cn(
                "min-w-0 truncate rounded-md border px-2 py-2 text-center text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50",
              )}
              disabled={!page.canEdit}
              style={labelColorStyle(label, selected)}
              type="button"
              title={label.name}
              onClick={() => {
                if (page.mode === "classification") {
                  page.annotation.commit({
                    classificationLabelId: selected ? null : label.id,
                    mask: page.annotation.current.mask,
                  });
                } else {
                  page.setActiveLabelId(label.id);
                }
              }}
            >
              {label.name}
            </button>
          );
        })}
        {page.labels.length === 0 ? (
          <div className="col-span-2 rounded-md border border-dashed border-border px-2 py-8 text-center text-muted-foreground text-xs">
            No labels loaded.
          </div>
        ) : null}
        {loading ? <p className="col-span-2 text-muted-foreground text-xs">Loading…</p> : null}
        {activeError ? <p className="col-span-2 text-destructive text-xs">{activeError}</p> : null}
      </Section>
      <Section title="Edit" contentClassName="grid grid-cols-2 gap-2">
        <Button
          disabled={!page.annotation.canUndo}
          size="sm"
          type="button"
          variant="outline"
          onClick={page.annotation.undo}
        >
          Undo
        </Button>
        <Button
          disabled={!page.annotation.canRedo}
          size="sm"
          type="button"
          variant="outline"
          onClick={page.annotation.redo}
        >
          Redo
        </Button>
        <Button
          disabled={page.mode !== "segmentation" || !page.canEdit}
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            page.frame &&
            page.annotation.commit({
              classificationLabelId: page.annotation.current.classificationLabelId,
              mask: createEmptyMask(page.frame.width, page.frame.height),
            })
          }
        >
          Clear
        </Button>
        <Button
          disabled={!page.annotation.dirty}
          size="sm"
          type="button"
          variant="outline"
          onClick={page.annotation.discard}
        >
          Discard
        </Button>
      </Section>
      {page.mode === "segmentation" ? (
        <Section title="Brush" contentClassName="flex flex-col gap-3">
          <AnnotationToolSlider
            label="Opacity"
            max={0.95}
            min={0.05}
            step={0.01}
            value={page.overlayOpacity}
            valueLabel={`${Math.round(page.overlayOpacity * 100)}%`}
            onChange={page.setOverlayOpacity}
          />
          <AnnotationToolSlider
            label="Brush Size"
            max={32}
            min={1}
            step={1}
            value={page.brushSize}
            valueLabel={String(Math.round(page.brushSize))}
            onChange={(value) => page.setBrushSize(Math.round(value))}
          />
        </Section>
      ) : null}
    </div>
  );
}
