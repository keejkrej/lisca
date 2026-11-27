import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button } from "@lisca/ui/button";
import { Icon } from "@lisca/ui/icons";
import { DockSection, PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { dockToolLabel, keyboardShortcutsSubscription } from "@lisca/ui/shell";
import {
  alignToolDefinitions as headlessAlignToolDefinitions,
  buildAlignToolActions,
} from "@lisca/ui-headless/align-tools";
import type { AlignGridToolMode } from "@lisca/utils";
import { Schema } from "effect";

export const alignToolDefinitions = headlessAlignToolDefinitions.map(({ mode, label }) => ({
  mode,
  label,
}));

export { buildAlignToolActions };

const AlignGridToolModeSchema = Schema.Literals([
  "pan",
  "rotate",
  "zoom-spacing",
  "zoom-pattern",
  "magnifier",
]);

const AlignToolLayoutSchema = Schema.Literals(["grid", "rail"]);

export type AlignToolButtonOptions<M> = {
  readonly mode: AlignGridToolMode;
  readonly active: boolean;
  readonly label: string;
  readonly onPress: M;
  readonly class?: string | undefined;
};

export type AlignToolButtonProps<M = never> = AlignToolButtonOptions<M>;

export function AlignToolButton<M>(h: Html.H<M>, options: AlignToolButtonOptions<M>) {
  return Button(h, {
    ariaLabel: options.label,
    class: options.class ?? "w-full min-w-0 justify-center gap-2 px-3",
    size: "sm",
    title: options.label,
    type: "button",
    variant: options.active ? "default" : "outline",
    onPress: options.onPress,
  }).children(h.span.class("max-w-full truncate").children(options.label));
}

const AlignToolToolbarMessage = UiSchema.TaggedEnum({
  SelectedMode: { mode: AlignGridToolModeSchema },
  ToggledSpacingZoomLock: {},
  ToggledPatternZoomLock: {},
});

const AlignToolToolbarEvents = UiSchema.TaggedEnum({
  ModeChanged: { mode: AlignGridToolModeSchema },
  SpacingZoomLockedChanged: { locked: Schema.Boolean },
  PatternZoomLockedChanged: { locked: Schema.Boolean },
});

const AlignToolToolbarComponent = Html.component({
  name: "LiscaAlignToolToolbar",
  props: Schema.Struct({
    mode: AlignGridToolModeSchema,
    spacingZoomLocked: Schema.Boolean,
    hasSpacingZoomLock: Schema.Boolean,
    patternZoomLocked: Schema.Boolean,
    hasPatternZoomLock: Schema.Boolean,
    shortcutsEnabled: Schema.Boolean,
    layout: AlignToolLayoutSchema,
  }),
  model: Schema.Struct({}),
  message: AlignToolToolbarMessage,
  events: AlignToolToolbarEvents,
}).make({
  init: () => ({}),
  update: {
    SelectedMode: ($, { mode }) => $.emit(AlignToolToolbarEvents.ModeChanged({ mode })),
    ToggledSpacingZoomLock: ($) =>
      $.props.hasSpacingZoomLock
        ? $.emit(
            AlignToolToolbarEvents.SpacingZoomLockedChanged({
              locked: !$.props.spacingZoomLocked,
            }),
          )
        : $.model,
    ToggledPatternZoomLock: ($) =>
      $.props.hasPatternZoomLock
        ? $.emit(
            AlignToolToolbarEvents.PatternZoomLockedChanged({
              locked: !$.props.patternZoomLocked,
            }),
          )
        : $.model,
  },
  subscriptions: ({ props }) => [
    keyboardShortcutsSubscription(
      alignToolDefinitions.map((tool, index) => ({
        id: `dock-tool-${tool.mode}`,
        key: String(index + 1),
        message: AlignToolToolbarMessage.SelectedMode({ mode: tool.mode }),
      })),
      { enabled: props.shortcutsEnabled },
    ),
  ],
  view: (h) => {
    const props = h.props;

    if (props.layout === "rail") {
      return RailControlStack(h)
        .attr("aria-label", "Align canvas tool")
        .attr("role", "toolbar")
        .children(
          ...alignToolDefinitions.map((tool, index) => {
            const label = props.shortcutsEnabled ? dockToolLabel(tool.label, index) : tool.label;
            const toolButton = Button(h, {
              ariaLabel: label,
              class: "h-8 w-full min-w-0 justify-start gap-2 px-3 text-xs",
              size: "sm",
              title: label,
              type: "button",
              variant: props.mode === tool.mode ? "default" : "outline",
              onPress: AlignToolToolbarMessage.SelectedMode({ mode: tool.mode }),
            }).children(
              props.shortcutsEnabled
                ? h.kbd
                    .class(
                      "flex size-4 shrink-0 items-center justify-center rounded-none bg-muted font-[inherit] font-medium text-[10px] text-muted-foreground",
                    )
                    .children(String(index + 1))
                : undefined,
              h.span.class("min-w-0 truncate").children(tool.label),
            );

            const zoomName =
              tool.mode === "zoom-spacing"
                ? "spacing"
                : tool.mode === "zoom-pattern"
                  ? "pattern"
                  : null;

            if (!zoomName) {
              return toolButton.key(tool.mode);
            }

            const zoomLocked =
              tool.mode === "zoom-spacing" ? props.spacingZoomLocked : props.patternZoomLocked;
            const hasZoomLock =
              tool.mode === "zoom-spacing" ? props.hasSpacingZoomLock : props.hasPatternZoomLock;
            const toggleMsg =
              tool.mode === "zoom-spacing"
                ? AlignToolToolbarMessage.ToggledSpacingZoomLock()
                : AlignToolToolbarMessage.ToggledPatternZoomLock();
            const lockLabel = `${zoomLocked ? "Unlock" : "Lock"} ${zoomName} zoom`;

            return h.div
              .key(tool.mode)
              .class("grid min-w-0 grid-cols-[minmax(0,1fr)_2rem] gap-1")
              .children(
                toolButton,
                Button(h, {
                  ariaLabel: lockLabel,
                  class: "size-8 px-0",
                  disabled: !hasZoomLock,
                  size: "sm",
                  title: lockLabel,
                  type: "button",
                  variant: zoomLocked ? "default" : "outline",
                  onPress: toggleMsg,
                }).children(Icon(h, zoomLocked ? "lock" : "lock-open", { class: "size-3.5" })),
              );
          }),
        );
    }

    return h.div
      .attr("aria-label", "Align canvas tool")
      .attr("role", "toolbar")
      .class("grid w-full grid-cols-2 gap-2")
      .children(
        ...alignToolDefinitions.map((tool, index) => {
          const label = props.shortcutsEnabled ? dockToolLabel(tool.label, index) : tool.label;
          const zoomName =
            tool.mode === "zoom-spacing"
              ? "spacing"
              : tool.mode === "zoom-pattern"
                ? "pattern"
                : null;
          const wrapperClass =
            index === alignToolDefinitions.length - 1 ? "col-span-2 min-w-0" : "min-w-0";

          if (!zoomName) {
            return h.div
              .key(tool.mode)
              .class(wrapperClass)
              .children(
                AlignToolButton(h, {
                  active: props.mode === tool.mode,
                  label,
                  mode: tool.mode,
                  onPress: AlignToolToolbarMessage.SelectedMode({ mode: tool.mode }),
                }),
              );
          }

          const zoomLocked =
            tool.mode === "zoom-spacing" ? props.spacingZoomLocked : props.patternZoomLocked;
          const hasZoomLock =
            tool.mode === "zoom-spacing" ? props.hasSpacingZoomLock : props.hasPatternZoomLock;
          const toggleMsg =
            tool.mode === "zoom-spacing"
              ? AlignToolToolbarMessage.ToggledSpacingZoomLock()
              : AlignToolToolbarMessage.ToggledPatternZoomLock();
          const lockLabel = `${zoomLocked ? "Unlock" : "Lock"} ${zoomName} zoom`;

          return h.div
            .key(tool.mode)
            .class(wrapperClass)
            .children(
              h.div.class("grid min-w-0 grid-cols-[1fr_2rem] gap-1").children(
                AlignToolButton(h, {
                  active: props.mode === tool.mode,
                  class: "w-full min-w-0 justify-center gap-2 px-2",
                  label,
                  mode: tool.mode,
                  onPress: AlignToolToolbarMessage.SelectedMode({ mode: tool.mode }),
                }),
                Button(h, {
                  ariaLabel: lockLabel,
                  class: "size-8 px-0",
                  disabled: !hasZoomLock,
                  size: "sm",
                  title: lockLabel,
                  type: "button",
                  variant: zoomLocked ? "default" : "outline",
                  onPress: toggleMsg,
                }).children(Icon(h, zoomLocked ? "lock" : "lock-open", { class: "size-4" })),
              ),
            );
        }),
      );
  },
});

export type AlignToolSectionOptions<M> = {
  readonly key?: string | undefined;
  readonly mode: AlignGridToolMode;
  readonly onModeChange: (mode: AlignGridToolMode) => M | undefined;
  readonly spacingZoomLocked?: boolean | undefined;
  readonly onSpacingZoomLockedChange?: ((locked: boolean) => M | undefined) | undefined;
  readonly patternZoomLocked?: boolean | undefined;
  readonly onPatternZoomLockedChange?: ((locked: boolean) => M | undefined) | undefined;
  readonly sectionTitle?: string | undefined;
  readonly sectionDescription?: string | undefined;
  readonly sectionClassName?: string | undefined;
  readonly sectionContentClassName?: string | undefined;
  readonly shortcutsEnabled?: boolean | undefined;
  readonly placement?: "dock" | "rail" | undefined;
};

export type AlignToolSectionProps<M = never> = AlignToolSectionOptions<M>;

export type AlignToolToolbarOptions<M> = Pick<
  AlignToolSectionOptions<M>,
  | "key"
  | "mode"
  | "onModeChange"
  | "spacingZoomLocked"
  | "onSpacingZoomLockedChange"
  | "patternZoomLocked"
  | "onPatternZoomLockedChange"
  | "shortcutsEnabled"
> & {
  readonly layout?: "grid" | "rail" | undefined;
};

export type AlignToolToolbarProps<M = never> = AlignToolToolbarOptions<M>;

export function AlignToolToolbar<M>(h: Html.H<M>, options: AlignToolToolbarOptions<M>) {
  return AlignToolToolbarComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      mode: options.mode,
      spacingZoomLocked: options.spacingZoomLocked ?? false,
      hasSpacingZoomLock: options.onSpacingZoomLockedChange !== undefined,
      patternZoomLocked: options.patternZoomLocked ?? false,
      hasPatternZoomLock: options.onPatternZoomLockedChange !== undefined,
      shortcutsEnabled: options.shortcutsEnabled ?? true,
      layout: options.layout ?? "grid",
    },
    onEmit: {
      ModeChanged: ({ mode }) => options.onModeChange(mode),
      SpacingZoomLockedChanged: ({ locked }) => options.onSpacingZoomLockedChange?.(locked),
      PatternZoomLockedChanged: ({ locked }) => options.onPatternZoomLockedChange?.(locked),
    },
  });
}

export function AlignToolSection<M>(h: Html.H<M>, options: AlignToolSectionOptions<M>) {
  const toolbarOptions: AlignToolToolbarOptions<M> = {
    key: "toolbar",
    mode: options.mode,
    onModeChange: options.onModeChange,
    spacingZoomLocked: options.spacingZoomLocked,
    onSpacingZoomLockedChange: options.onSpacingZoomLockedChange,
    patternZoomLocked: options.patternZoomLocked,
    onPatternZoomLockedChange: options.onPatternZoomLockedChange,
    shortcutsEnabled: options.shortcutsEnabled,
  };

  if (options.placement === "rail") {
    return PanelSection(h, {
      ...(options.key !== undefined ? { key: options.key } : {}),
      appearance: "rail",
      class: options.sectionClassName,
      contentClassName: options.sectionContentClassName,
      description: options.sectionDescription,
      title: options.sectionTitle ?? "Tool",
      children: AlignToolToolbar(h, { ...toolbarOptions, layout: "rail" }),
    });
  }

  return DockSection(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    class: options.sectionClassName,
    contentClassName: options.sectionContentClassName,
    description: options.sectionDescription,
    title: options.sectionTitle ?? "Tool",
    children: AlignToolToolbar(h, toolbarOptions),
  });
}
