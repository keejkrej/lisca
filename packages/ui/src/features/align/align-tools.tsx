import IconLockRegular from "phosphor-icons-solid/IconLockRegular";
import IconLockOpenRegular from "phosphor-icons-solid/IconLockOpenRegular";
import { createEffect, For, onCleanup, Show } from "solid-js";
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

function AlignToolCell(props: {
  tool: (typeof alignToolDefinitions)[number];
  index: number;
  mode: AlignGridToolMode;
  onModeChange: (mode: AlignGridToolMode) => void;
  spacingZoomLocked: boolean;
  onSpacingZoomLockedChange?: (locked: boolean) => void;
  patternZoomLocked: boolean;
  onPatternZoomLockedChange?: (locked: boolean) => void;
  shortcutsEnabled: boolean;
}) {
  const label = () =>
    props.shortcutsEnabled ? dockToolLabel(props.tool.label, props.index) : props.tool.label;
  const zoomName =
    props.tool.mode === "zoom-spacing"
      ? "spacing"
      : props.tool.mode === "zoom-pattern"
        ? "pattern"
        : null;
  const zoomLocked = () =>
    props.tool.mode === "zoom-spacing" ? props.spacingZoomLocked : props.patternZoomLocked;
  const onZoomLockedChange = () =>
    props.tool.mode === "zoom-spacing"
      ? props.onSpacingZoomLockedChange
      : props.onPatternZoomLockedChange;

  return (
    <div class={props.index === alignToolDefinitions.length - 1 ? "col-span-2 min-w-0" : "min-w-0"}>
      <Show
        when={zoomName}
        fallback={
          <AlignToolButton
            active={props.mode === props.tool.mode}
            label={label()}
            mode={props.tool.mode}
            onClick={() => props.onModeChange(props.tool.mode)}
          />
        }
      >
        {(name) => (
          <div class="grid min-w-0 grid-cols-[1fr_2rem] gap-1">
            <AlignToolButton
              active={props.mode === props.tool.mode}
              class="w-full min-w-0 justify-center gap-2 px-2"
              label={label()}
              mode={props.tool.mode}
              onClick={() => props.onModeChange(props.tool.mode)}
            />
            <Button
              aria-label={`${zoomLocked() ? "Unlock" : "Lock"} ${name()} zoom`}
              class="size-8 px-0"
              disabled={!onZoomLockedChange()}
              size="sm"
              title={`${zoomLocked() ? "Unlock" : "Lock"} ${name()} zoom`}
              type="button"
              variant={zoomLocked() ? "default" : "outline"}
              onClick={() => onZoomLockedChange()?.(!zoomLocked())}
            >
              {zoomLocked() ? (
                <IconLockRegular class="size-4" />
              ) : (
                <IconLockOpenRegular class="size-4" />
              )}
            </Button>
          </div>
        )}
      </Show>
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

  return (
    <Show
      when={props.layout === "rail"}
      fallback={
        <div aria-label="Align canvas tool" class="grid w-full grid-cols-2 gap-2" role="toolbar">
          <For each={alignToolDefinitions}>
            {(tool, index) => (
              <AlignToolCell
                index={index()}
                mode={props.mode}
                patternZoomLocked={patternZoomLocked()}
                shortcutsEnabled={shortcutsEnabled()}
                spacingZoomLocked={spacingZoomLocked()}
                tool={tool}
                onModeChange={props.onModeChange}
                onPatternZoomLockedChange={props.onPatternZoomLockedChange}
                onSpacingZoomLockedChange={props.onSpacingZoomLockedChange}
              />
            )}
          </For>
        </div>
      }
    >
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
            const onZoomLockedChange = () =>
              tool.mode === "zoom-spacing"
                ? props.onSpacingZoomLockedChange
                : props.onPatternZoomLockedChange;

            return zoomName ? (
              <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_2rem] gap-1">
                {toolButton()}
                <Button
                  aria-label={`${zoomLocked() ? "Unlock" : "Lock"} ${zoomName} zoom`}
                  class="size-8 rounded-full px-0"
                  disabled={!onZoomLockedChange()}
                  size="sm"
                  title={`${zoomLocked() ? "Unlock" : "Lock"} ${zoomName} zoom`}
                  type="button"
                  variant={zoomLocked() ? "default" : "outline"}
                  onClick={() => onZoomLockedChange()?.(!zoomLocked())}
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
    </Show>
  );
}

export function AlignToolSection(props: AlignToolSectionProps) {
  return (
    <Show
      when={props.placement === "rail"}
      fallback={
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
            spacingZoomLocked={props.spacingZoomLocked}
            onModeChange={props.onModeChange}
            onPatternZoomLockedChange={props.onPatternZoomLockedChange}
            onSpacingZoomLockedChange={props.onSpacingZoomLockedChange}
          />
        </DockSection>
      }
    >
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
          patternZoomLocked={props.patternZoomLocked}
          shortcutsEnabled={props.shortcutsEnabled}
          spacingZoomLocked={props.spacingZoomLocked}
          onModeChange={props.onModeChange}
          onPatternZoomLockedChange={props.onPatternZoomLockedChange}
          onSpacingZoomLockedChange={props.onSpacingZoomLockedChange}
        />
      </PanelSection>
    </Show>
  );
}
