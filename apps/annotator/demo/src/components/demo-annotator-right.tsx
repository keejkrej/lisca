import type { AnnotationLabel, AnnotationMode } from "@lisca/contracts";
import { Button, cn } from "@lisca/ui/components";
import { AnnotationModeToggle, AnnotationToolSlider } from "@lisca/ui/features";
import { Section } from "@lisca/ui/shell";
import { labelColorStyle, type AnnotationValue } from "../utils/annotation-utils";

export function DemoAnnotatorRight(props: {
  labels: AnnotationLabel[];
  mode: AnnotationMode;
  overlayOpacity: number;
  brushSize: number;
  activeLabelId: string | null;
  annotation: AnnotationValue;
  canEdit: boolean;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  error: string | null;
  frameLoading: boolean;
  onModeChange: (mode: AnnotationMode) => void;
  onOverlayOpacityChange: (value: number) => void;
  onBrushSizeChange: (value: number) => void;
  onClassificationChange: (labelId: string | null) => void;
  onPaintLabelChange: (labelId: string) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
      <Section title="Mode">
        <AnnotationModeToggle className="w-full" mode={props.mode} onModeChange={props.onModeChange} />
      </Section>
      <Section title="Labels" contentClassName="grid grid-cols-2 gap-2">
        {props.labels.map((label) => {
          const selected =
            props.mode === "classification"
              ? props.annotation.classificationLabelId === label.id
              : props.activeLabelId === label.id;
          return (
            <button
              key={label.id}
              className={cn(
                "min-w-0 truncate rounded-md border px-2 py-2 text-center text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50",
              )}
              disabled={!props.canEdit}
              style={labelColorStyle(label, selected)}
              type="button"
              title={label.name}
              onClick={() => {
                if (props.mode === "classification") {
                  props.onClassificationChange(selected ? null : label.id);
                } else {
                  props.onPaintLabelChange(label.id);
                }
              }}
            >
              {label.name}
            </button>
          );
        })}
        {props.frameLoading ? (
          <p className="col-span-2 text-muted-foreground text-xs">Loading…</p>
        ) : null}
        {props.error ? <p className="col-span-2 text-destructive text-xs">{props.error}</p> : null}
      </Section>
      <Section title="Edit" contentClassName="grid grid-cols-2 gap-2">
        <Button disabled={!props.canUndo} size="sm" type="button" variant="outline" onClick={props.onUndo}>
          Undo
        </Button>
        <Button disabled={!props.canRedo} size="sm" type="button" variant="outline" onClick={props.onRedo}>
          Redo
        </Button>
        <Button
          disabled={props.mode !== "segmentation" || !props.canEdit}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onClear}
        >
          Clear
        </Button>
        <Button disabled={!props.dirty} size="sm" type="button" variant="outline" onClick={props.onDiscard}>
          Discard
        </Button>
      </Section>
      {props.mode === "segmentation" ? (
        <Section title="Brush" contentClassName="flex flex-col gap-3">
          <AnnotationToolSlider
            label="Opacity"
            max={0.95}
            min={0.05}
            step={0.01}
            value={props.overlayOpacity}
            valueLabel={`${Math.round(props.overlayOpacity * 100)}%`}
            onChange={props.onOverlayOpacityChange}
          />
          <AnnotationToolSlider
            label="Brush Size"
            max={32}
            min={1}
            step={1}
            value={props.brushSize}
            valueLabel={String(Math.round(props.brushSize))}
            onChange={(value) => props.onBrushSizeChange(Math.round(value))}
          />
        </Section>
      ) : null}
    </div>
  );
}
