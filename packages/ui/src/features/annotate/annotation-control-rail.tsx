import type { AnnotationLabel } from "@lisca/contracts";
import type { AnnotationMode } from "@lisca/ui-headless/types";
import { createEmptyMask, labelColorStyle, type FrameResult } from "@lisca/utils";
import { For, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { PanelSection } from "../../shell/regions/panel-section";

import { AnnotationModeToggle } from "./annotation-mode-toggle";
import { AnnotationToolSlider } from "./annotation-tool-slider";

export type AnnotationControlValue = {
  classificationLabelId: string | null;
  mask: Uint8Array;
};

export type AnnotationControlHandle = {
  current: AnnotationControlValue;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  discard: () => void;
  commit: (value: AnnotationControlValue) => void;
};

export type AnnotationControlRailProps = {
  labels: readonly AnnotationLabel[];
  mode: AnnotationMode;
  overlayOpacity: number;
  brushSize: number;
  activeLabelId: string | null;
  annotation: AnnotationControlHandle;
  canEdit: boolean;
  scanLoading?: boolean;
  frameLoading?: boolean;
  annotationLoading?: boolean;
  scanError?: string | null;
  frameError?: string | null;
  annotationError?: string | null;
  saveError?: string | null;
  workspacePath?: string | null;
  frame: FrameResult | null;
  setMode: (mode: AnnotationMode) => void;
  setOverlayOpacity: (value: number) => void;
  setBrushSize: (value: number) => void;
  setActiveLabelId: (id: string) => void;
  openLabelDialog: () => void;
};

export function AnnotationControlRail(props: AnnotationControlRailProps) {
  const activeError = () =>
    props.scanError ?? props.frameError ?? props.annotationError ?? props.saveError;
  const loading = () => props.scanLoading || props.frameLoading || props.annotationLoading;

  return (
    <>
      <PanelSection title="Mode">
        <AnnotationModeToggle class="w-full" mode={props.mode} onModeChange={props.setMode} />
      </PanelSection>
      <PanelSection contentClassName="grid grid-cols-2 gap-2" title="Labels">
        <For each={props.labels}>
          {(label) => {
            const selected =
              props.mode === "classification"
                ? props.annotation.current.classificationLabelId === label.id
                : props.activeLabelId === label.id;
            return (
              <button
                class={cn(
                  "min-w-0 truncate rounded-md border px-2 py-2 text-center text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50",
                )}
                disabled={!props.canEdit}
                style={labelColorStyle(label, selected)}
                type="button"
                title={label.name}
                onClick={() => {
                  if (props.mode === "classification") {
                    props.annotation.commit({
                      classificationLabelId: selected ? null : label.id,
                      mask: props.annotation.current.mask,
                    });
                  } else {
                    props.setActiveLabelId(label.id);
                  }
                }}
              >
                {label.name}
              </button>
            );
          }}
        </For>
        <Show
          when={props.labels.length === 0}
          fallback={
            <Button
              class="col-span-2 w-full"
              disabled={!props.workspacePath}
              size="sm"
              type="button"
              variant="outline"
              onClick={props.openLabelDialog}
            >
              Edit labels
            </Button>
          }
        >
          <Button
            class="col-span-2 w-full"
            disabled={!props.workspacePath}
            size="sm"
            type="button"
            variant="outline"
            onClick={props.openLabelDialog}
          >
            Add
          </Button>
        </Show>
        <Show when={loading()}>
          <p class="col-span-2 text-muted-foreground text-xs">Loading…</p>
        </Show>
        <Show when={activeError()}>
          <p class="col-span-2 text-destructive text-xs">{activeError()}</p>
        </Show>
      </PanelSection>
      <PanelSection contentClassName="grid grid-cols-2 gap-2" title="Edit">
        <Button
          disabled={!props.annotation.canUndo}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.annotation.undo}
        >
          Undo
        </Button>
        <Button
          disabled={!props.annotation.canRedo}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.annotation.redo}
        >
          Redo
        </Button>
        <Button
          disabled={props.mode !== "segmentation" || !props.canEdit}
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            props.frame &&
            props.annotation.commit({
              classificationLabelId: props.annotation.current.classificationLabelId,
              mask: createEmptyMask(props.frame.width, props.frame.height),
            })
          }
        >
          Clear
        </Button>
        <Button
          disabled={!props.annotation.dirty}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.annotation.discard}
        >
          Discard
        </Button>
      </PanelSection>
      <Show when={props.mode === "segmentation"}>
        <PanelSection contentClassName="flex flex-col gap-3" title="Brush">
          <AnnotationToolSlider
            label="Opacity"
            max={0.95}
            min={0.05}
            step={0.01}
            value={props.overlayOpacity}
            valueLabel={`${Math.round(props.overlayOpacity * 100)}%`}
            onChange={props.setOverlayOpacity}
          />
          <AnnotationToolSlider
            label="Brush Size"
            max={32}
            min={1}
            step={1}
            value={props.brushSize}
            valueLabel={String(Math.round(props.brushSize))}
            onChange={(value) => props.setBrushSize(Math.round(value))}
          />
        </PanelSection>
      </Show>
    </>
  );
}
