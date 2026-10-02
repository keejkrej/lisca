import type { AnnotationLabel } from "@lisca/contracts";
import type { AnnotationMode } from "@lisca/ui-headless/types";
import { createEmptyMask, labelColorStyle, type FrameResult } from "@lisca/utils";
import { CheckIcon } from "lucide-solid";
import { For, onCleanup, onMount, Show, type JSX } from "solid-js";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { PanelSection } from "../../shell/regions/panel-section";
import { RailActionPair, RailControlStack } from "../../shell/regions/rail-control-layout";

import { AnnotationModeToggle } from "./annotation-mode-toggle";
import { AnnotationToolSlider } from "./annotation-tool-slider";

const LABEL_SHORTCUT_LIMIT = 9;

/** Digit-row code. Shift+1 reports key "!" on a US layout, so the code is the stable signal. */
function labelShortcutDigit(event: KeyboardEvent): number | null {
  if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
    return null;
  }
  const match = /^Digit([1-9])$/.exec(event.code);
  return match ? Number(match[1]) : null;
}

function labelShortcutBlocked(target: EventTarget | null): boolean {
  if (target instanceof Element) {
    if (target.closest("input, textarea, select, [contenteditable='true']")) return true;
    if (target.closest("[role='dialog'], dialog")) return true;
  }
  return Boolean(document.querySelector("[role='dialog'], dialog[open]"));
}

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
  /** Rendered after Mode and before Labels. Studio uses this for the Tool list. */
  insertAfterMode?: JSX.Element;
};

export function AnnotationControlRail(props: AnnotationControlRailProps) {
  const loading = () => props.scanLoading || props.frameLoading || props.annotationLoading;
  const isRail = () => props.sectionAppearance === "rail";

  const chooseLabel = (label: AnnotationLabel) => {
    if (props.mode === "classification") {
      const selected = props.annotation.current.classificationLabelId === label.id;
      props.annotation.commit({
        classificationLabelId: selected ? null : label.id,
        mask: props.annotation.current.mask,
      });
      return;
    }
    props.setActiveLabelId(label.id);
  };

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!props.canEdit) return;
      const digit = labelShortcutDigit(event);
      if (digit == null || labelShortcutBlocked(event.target)) return;
      const label = props.labels[digit - 1];
      if (!label) return;
      event.preventDefault();
      chooseLabel(label);
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  const ModeControl = () => (
    <AnnotationModeToggle class="w-full" mode={props.mode} onModeChange={props.setMode} />
  );

  const LabelControls = () => (
    <>
      <For each={props.labels}>
        {(label, index) => {
          // The For callback runs once per label. Selection has to be read
          // inside the button so the highlight follows later clicks.
          const selected = () =>
            props.mode === "classification"
              ? props.annotation.current.classificationLabelId === label.id
              : props.activeLabelId === label.id;
          const shortcut = () => (index() < LABEL_SHORTCUT_LIMIT ? index() + 1 : null);
          return (
            <button
              aria-keyshortcuts={shortcut() ? `Shift+${shortcut()}` : undefined}
              aria-pressed={selected()}
              class="relative flex h-8 w-full min-w-0 items-center justify-center border pr-9 pl-7 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!props.canEdit}
              style={labelColorStyle(label, selected())}
              type="button"
              title={label.name}
              onClick={() => chooseLabel(label)}
            >
              <Show when={selected()}>
                <CheckIcon class="absolute left-2 size-3.5" />
              </Show>
              <span class="truncate">{label.name}</span>
              <Show when={shortcut()}>
                {(digit) => (
                  <kbd
                    aria-hidden="true"
                    class="pointer-events-none absolute right-1.5 flex h-4 items-center font-[inherit] text-[10px] font-medium leading-none text-current"
                  >
                    ⇧{digit()}
                  </kbd>
                )}
              </Show>
            </button>
          );
        }}
      </For>
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
      <Show when={loading()}>
        <p class="col-span-full text-xs text-muted-foreground">Loading…</p>
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
      {props.insertAfterMode}
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
