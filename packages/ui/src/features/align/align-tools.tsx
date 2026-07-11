import IconLockRegular from "phosphor-icons-solid/IconLockRegular";
import IconLockOpenRegular from "phosphor-icons-solid/IconLockOpenRegular";
import { createEffect, onCleanup } from "solid-js";
import type { AlignGridToolMode } from "@lisca/utils";
import {
  alignToolDefinitions as headlessAlignToolDefinitions,
  buildAlignToolActions,
} from "@lisca/ui-headless/align-tools";
import { resolveKeyboardShortcut, type KeyboardShortcut } from "@lisca/ui-headless/shortcuts";

import { Button } from "../../components/ui/button";
import { DockSection } from "../../shell/regions/dock-section";
import { dockToolLabel, dockToolShortcuts } from "@lisca/ui/shell";

export type AlignToolSectionProps = {
  mode: AlignGridToolMode;
  onModeChange: (mode: AlignGridToolMode) => void;
  patternZoomLocked?: boolean;
  onPatternZoomLockedChange?: (locked: boolean) => void;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  shortcutsEnabled?: boolean;
};

export const alignToolDefinitions = headlessAlignToolDefinitions.map(({ mode, label }) => ({
  mode,
  label,
}));

export { buildAlignToolActions };

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function useKeyboardShortcuts(
  shortcuts: () => readonly KeyboardShortcut[],
  options?: () => { enabled?: boolean },
) {
  createEffect(() => {
    const enabled = options?.().enabled ?? true;
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = resolveKeyboardShortcut(shortcuts(), {
        key: event.key,
        editableTarget: isEditableTarget(event.target),
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      });
      if (!shortcut) return;

      event.preventDefault();
      shortcut.onTrigger();
    };

    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });
}

export function AlignToolButton(props: {
  mode: AlignGridToolMode;
  active: boolean;
  label: string;
  onClick: () => void;
  class?: string;
}) {
  return (
    <Button
      aria-label={props.label}
      class={props.class ?? "w-full min-w-0 justify-center gap-2 px-3"}
      size="sm"
      title={props.label}
      type="button"
      variant={props.active ? "default" : "outline"}
      onClick={props.onClick}
    >
      <span class="max-w-full truncate">{props.label}</span>
    </Button>
  );
}

function renderAlignToolCell(
  tool: (typeof alignToolDefinitions)[number],
  index: number,
  mode: AlignGridToolMode,
  onModeChange: (mode: AlignGridToolMode) => void,
  patternZoomLocked: boolean,
  onPatternZoomLockedChange: ((locked: boolean) => void) | undefined,
  shortcutsEnabled: boolean,
) {
  const label = shortcutsEnabled ? dockToolLabel(tool.label, index) : tool.label;
  if (tool.mode === "zoom-pattern") {
    return (
      <div class="min-w-0">
        <div class="grid min-w-0 grid-cols-[1fr_2rem] gap-1">
          <AlignToolButton
            active={mode === tool.mode}
            class="w-full min-w-0 justify-center gap-2 px-2"
            label={label}
            mode={tool.mode}
            onClick={() => onModeChange(tool.mode)}
          />
          <Button
            aria-label={patternZoomLocked ? "Unlock pattern zoom" : "Lock pattern zoom"}
            class="w-full px-0"
            disabled={!onPatternZoomLockedChange}
            size="sm"
            title={patternZoomLocked ? "Unlock pattern zoom" : "Lock pattern zoom"}
            type="button"
            variant={patternZoomLocked ? "default" : "outline"}
            onClick={() => onPatternZoomLockedChange?.(!patternZoomLocked)}
          >
            {patternZoomLocked ? (
              <IconLockRegular class="size-4" />
            ) : (
              <IconLockOpenRegular class="size-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div class="min-w-0">
      <AlignToolButton
        active={mode === tool.mode}
        label={label}
        mode={tool.mode}
        onClick={() => onModeChange(tool.mode)}
      />
    </div>
  );
}

export type AlignToolToolbarProps = Pick<
  AlignToolSectionProps,
  "mode" | "onModeChange" | "patternZoomLocked" | "onPatternZoomLockedChange" | "shortcutsEnabled"
>;

export function AlignToolToolbar(props: AlignToolToolbarProps) {
  const patternZoomLocked = () => props.patternZoomLocked ?? false;
  const shortcutsEnabled = () => props.shortcutsEnabled ?? true;
  const toolActions = () => buildAlignToolActions(props.mode, props.onModeChange);

  useKeyboardShortcuts(() => dockToolShortcuts(toolActions()), () => ({
    enabled: shortcutsEnabled(),
  }));

  const cells = () =>
    alignToolDefinitions.map((tool, index) =>
      renderAlignToolCell(
        tool,
        index,
        props.mode,
        props.onModeChange,
        patternZoomLocked(),
        props.onPatternZoomLockedChange,
        shortcutsEnabled(),
      ),
    );

  return (
    <div aria-label="Align canvas tool" class="flex w-full flex-col gap-2" role="toolbar">
      <div class="grid w-full grid-cols-2 gap-2">
        {cells()[0]}
        {cells()[1]}
      </div>
      <div class="grid w-full grid-cols-2 gap-2">
        {cells()[2]}
        {cells()[3]}
      </div>
    </div>
  );
}

export function AlignToolSection(props: AlignToolSectionProps) {
  return (
    <DockSection
      class={props.sectionClassName}
      contentClassName={props.sectionContentClassName}
      description={props.sectionDescription}
      title={props.sectionTitle ?? "Tool"}
    >
      <AlignToolToolbar
        mode={props.mode}
        patternZoomLocked={props.patternZoomLocked}
        shortcutsEnabled={props.shortcutsEnabled}
        onModeChange={props.onModeChange}
        onPatternZoomLockedChange={props.onPatternZoomLockedChange}
      />
    </DockSection>
  );
}