import type { AnnotationLabel } from "@lisca/contracts";
import type { AnnotationMode } from "@lisca/ui-headless/types";
import { createEmptyMask, labelColorStyle, type FrameResult } from "@lisca/utils";
import { For, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { PanelSection } from "../../shell/regions/panel-section";
import { RailActionPair, RailControlStack } from "../../shell/regions/rail-control-layout";

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
  sectionAppearance?: "framed" | "rail";
};

export function AnnotationControlRail(props: AnnotationControlRailProps) {
  const activeError = () =>
    props.scanError ?? props.frameError ?? props.annotationError ?? props.saveError;
  const loading = () => props.scanLoading || props.frameLoading || props.annotationLoading;
  const isRail = () => props.sectionAppearance === "rail";

  const ModeControl = () => (
    <AnnotationModeToggle class="w-full" mode={props.mode} onModeChange={props.setMode} />
  );

  const LabelControls = () => (
    <>
      <For each={props.labels}>
        {(label) => {
          const selected =
            props.mode === "classification"
              ? props.annotation.current.classificationLabelId === label.id
              : props.activeLabelId === label.id;
          return (
            <button
              class="h-8 min-w-0 w-full truncate rounded-full border px-2 text-center text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
            class="col-span-full w-full"
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
          class="col-span-full w-full"
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
        <p class="col-span-full text-xs text-muted-foreground">Loading…</p>
      </Show>
      <Show when={activeError()}>
        <p class="col-span-full text-xs text-destructive" role="alert">
          {activeError()}
        </p>
      </Show>
    </>
  );

  const EditControls = () => (
    <>
      <Button
        class="w-full"
        disabled={!props.annotation.canUndo}
        size="sm"
        type="button"
        variant="outline"
        onClick={props.annotation.undo}
      >
        Undo
      </Button>
      <Button
        class="w-full"
        disabled={!props.annotation.canRedo}
        size="sm"
        type="button"
        variant="outline"
        onClick={props.annotation.redo}
      >
        Redo
      </Button>
      <Button
        class="w-full"
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
        class="w-full"
        disabled={!props.annotation.dirty}
        size="sm"
        type="button"
        variant="outline"
        onClick={props.annotation.discard}
      >
        Discard
      </Button>
    </>
  );

  return (
    <>
      <PanelSection appearance={props.sectionAppearance} title="Mode">
        <Show when={isRail()} fallback={<ModeControl />}>
          <RailControlStack>
            <ModeControl />
          </RailControlStack>
        </Show>
      </PanelSection>
      <PanelSection
        appearance={props.sectionAppearance}
        contentClassName={isRail() ? undefined : "grid grid-cols-2 gap-2"}
        title="Labels"
      >
        <Show when={isRail()} fallback={<LabelControls />}>
          <RailControlStack>
            <LabelControls />
          </RailControlStack>
        </Show>
      </PanelSection>
      <PanelSection
        appearance={props.sectionAppearance}
        contentClassName={isRail() ? undefined : "grid grid-cols-2 gap-2"}
        title="Edit"
      >
        <Show when={isRail()} fallback={<EditControls />}>
          <RailControlStack>
            <RailActionPair label="History">
              <Button
                class="w-full"
                disabled={!props.annotation.canUndo}
                size="sm"
                type="button"
                variant="outline"
                onClick={props.annotation.undo}
              >
                Undo
              </Button>
              <Button
                class="w-full"
                disabled={!props.annotation.canRedo}
                size="sm"
                type="button"
                variant="outline"
                onClick={props.annotation.redo}
              >
                Redo
              </Button>
            </RailActionPair>
            <RailActionPair label="Annotation cleanup">
              <Button
                class="w-full"
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
                class="w-full"
                disabled={!props.annotation.dirty}
                size="sm"
                type="button"
                variant="outline"
                onClick={props.annotation.discard}
              >
                Discard
              </Button>
            </RailActionPair>
          </RailControlStack>
        </Show>
      </PanelSection>
      <Show when={props.mode === "segmentation"}>
        <PanelSection
          appearance={props.sectionAppearance}
          contentClassName={isRail() ? undefined : "flex flex-col gap-3"}
          title="Brush"
        >
          <Show
            when={isRail()}
            fallback={
              <>
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
              </>
            }
          >
            <RailControlStack>
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
            </RailControlStack>
          </Show>
        </PanelSection>
      </Show>
    </>
  );
}
