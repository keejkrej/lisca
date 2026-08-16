import IconLockRegular from "phosphor-icons-solid/IconLockRegular";
import IconLockOpenRegular from "phosphor-icons-solid/IconLockOpenRegular";
import { createEffect, For, onCleanup } from "solid-js";
import type { AlignGridToolMode } from "@lisca/utils";
import {
  alignToolDefinitions as headlessAlignToolDefinitions,
  buildAlignToolActions,
} from "@lisca/ui-headless/align-tools";
import { resolveKeyboardShortcut, type KeyboardShortcut } from "@lisca/utils";

import { Button } from "../../components/ui/button";
import { DockSection } from "../../shell/regions/dock-section";
import { PanelSection } from "../../shell/regions/panel-section";
import { RailControlStack } from "../../shell/regions/rail-control-layout";
import { dockToolLabel, dockToolShortcuts } from "@lisca/ui/shell";

export type AlignToolSectionProps = {
  mode: AlignGridToolMode;
  onModeChange: (mode: AlignGridToolMode) => void;
  spacingZoomLocked?: boolean;
  onSpacingZoomLockedChange?: (locked: boolean) => void;
  patternZoomLocked?: boolean;
  onPatternZoomLockedChange?: (locked: boolean) => void;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  shortcutsEnabled?: boolean;
  placement?: "dock" | "rail";
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
  spacingZoomLocked: boolean,
  onSpacingZoomLockedChange: ((locked: boolean) => void) | undefined,
  patternZoomLocked: boolean,
  onPatternZoomLockedChange: ((locked: boolean) => void) | undefined,
  shortcutsEnabled: boolean,
) {
  const label = shortcutsEnabled ? dockToolLabel(tool.label, index) : tool.label;
  const zoomLock =
    tool.mode === "zoom-spacing"
      ? {
          locked: spacingZoomLocked,
          name: "spacing",
          onChange: onSpacingZoomLockedChange,
        }
      : tool.mode === "zoom-pattern"
        ? {
            locked: patternZoomLocked,
            name: "pattern",
            onChange: onPatternZoomLockedChange,
          }
        : null;
  if (zoomLock) {
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
            aria-label={`${zoomLock.locked ? "Unlock" : "Lock"} ${zoomLock.name} zoom`}
            class="size-8 px-0"
            disabled={!zoomLock.onChange}
            size="sm"
            title={`${zoomLock.locked ? "Unlock" : "Lock"} ${zoomLock.name} zoom`}
            type="button"
            variant={zoomLock.locked ? "default" : "outline"}
            onClick={() => zoomLock.onChange?.(!zoomLock.locked)}
          >
            {zoomLock.locked ? (
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
  | "mode"
  | "onModeChange"
  | "spacingZoomLocked"
  | "onSpacingZoomLockedChange"
  | "patternZoomLocked"
  | "onPatternZoomLockedChange"
  | "shortcutsEnabled"
> & {
  layout?: "grid" | "rail";
};

export function AlignToolToolbar(props: AlignToolToolbarProps) {
  const spacingZoomLocked = () => props.spacingZoomLocked ?? false;
  const patternZoomLocked = () => props.patternZoomLocked ?? false;
  const shortcutsEnabled = () => props.shortcutsEnabled ?? true;
  const toolActions = () => buildAlignToolActions(props.mode, props.onModeChange);

  useKeyboardShortcuts(
    () => dockToolShortcuts(toolActions()),
    () => ({
      enabled: shortcutsEnabled(),
    }),
  );

  const cells = () =>
    alignToolDefinitions.map((tool, index) =>
      renderAlignToolCell(
        tool,
        index,
        props.mode,
        props.onModeChange,
        spacingZoomLocked(),
        props.onSpacingZoomLockedChange,
        patternZoomLocked(),
        props.onPatternZoomLockedChange,
        shortcutsEnabled(),
      ),
    );

  if (props.layout === "rail") {
    return (
      <RailControlStack aria-label="Align canvas tool" role="toolbar">
        <For each={alignToolDefinitions}>
          {(tool, index) => {
            const label = () =>
              shortcutsEnabled() ? dockToolLabel(tool.label, index()) : tool.label;
            const toolButton = () => (
              <Button
                aria-label={label()}
                class="h-8 w-full min-w-0 justify-between rounded-full px-3 text-xs"
                size="sm"
                title={label()}
                type="button"
                variant={props.mode === tool.mode ? "default" : "outline"}
                onClick={() => props.onModeChange(tool.mode)}
              >
                <span class="min-w-0 truncate">{tool.label}</span>
                {shortcutsEnabled() ? (
                  <kbd class="ml-auto flex size-4 shrink-0 items-center justify-center rounded-full bg-muted font-[inherit] font-medium text-[10px] text-muted-foreground">
                    {index() + 1}
                  </kbd>
                ) : null}
              </Button>
            );

            const zoomName =
              tool.mode === "zoom-spacing"
                ? "spacing"
                : tool.mode === "zoom-pattern"
                  ? "pattern"
                  : null;
            const zoomLocked = () =>
              tool.mode === "zoom-spacing" ? spacingZoomLocked() : patternZoomLocked();
            const onZoomLockedChange =
              tool.mode === "zoom-spacing"
                ? props.onSpacingZoomLockedChange
                : props.onPatternZoomLockedChange;

            return zoomName ? (
              <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_2rem] gap-1">
                {toolButton()}
                <Button
                  aria-label={`${zoomLocked() ? "Unlock" : "Lock"} ${zoomName} zoom`}
                  class="size-8 rounded-full px-0"
                  disabled={!onZoomLockedChange}
                  size="sm"
                  title={`${zoomLocked() ? "Unlock" : "Lock"} ${zoomName} zoom`}
                  type="button"
                  variant={zoomLocked() ? "default" : "outline"}
                  onClick={() => onZoomLockedChange?.(!zoomLocked())}
                >
                  {zoomLocked() ? (
                    <IconLockRegular class="size-3.5" />
                  ) : (
                    <IconLockOpenRegular class="size-3.5" />
                  )}
                </Button>
              </div>
            ) : (
              toolButton()
            );
          }}
        </For>
      </RailControlStack>
    );
  }

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
      <div class="w-full">{cells()[4]}</div>
    </div>
  );
}

export function AlignToolSection(props: AlignToolSectionProps) {
  if (props.placement === "rail") {
    return (
      <PanelSection
        appearance="rail"
        class={props.sectionClassName}
        contentClassName={props.sectionContentClassName}
        description={props.sectionDescription}
        title={props.sectionTitle ?? "Tool"}
      >
        <AlignToolToolbar
          layout="rail"
          mode={props.mode}
          spacingZoomLocked={props.spacingZoomLocked}
          patternZoomLocked={props.patternZoomLocked}
          shortcutsEnabled={props.shortcutsEnabled}
          onModeChange={props.onModeChange}
          onSpacingZoomLockedChange={props.onSpacingZoomLockedChange}
          onPatternZoomLockedChange={props.onPatternZoomLockedChange}
        />
      </PanelSection>
    );
  }

  return (
    <DockSection
      class={props.sectionClassName}
      contentClassName={props.sectionContentClassName}
      description={props.sectionDescription}
      title={props.sectionTitle ?? "Tool"}
    >
      <AlignToolToolbar
        mode={props.mode}
        spacingZoomLocked={props.spacingZoomLocked}
        patternZoomLocked={props.patternZoomLocked}
        shortcutsEnabled={props.shortcutsEnabled}
        onModeChange={props.onModeChange}
        onSpacingZoomLockedChange={props.onSpacingZoomLockedChange}
        onPatternZoomLockedChange={props.onPatternZoomLockedChange}
      />
    </DockSection>
  );
}
