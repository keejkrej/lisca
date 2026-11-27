import { UiSchema, type View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";

import { Icon } from "../../icons";
import { cn } from "../../lib/utils";
import { Panel, PanelContent, PanelDescription, PanelHeader } from "./panel";

export type SectionChevron = "vertical" | "horizontal";

const SectionDisclosureMessage = UiSchema.TaggedEnum({
  Toggled: {},
});

const SectionDisclosure = Html.component({
  name: "LiscaSectionDisclosure",
  props: Schema.Struct({
    defaultCollapsed: Schema.optional(Schema.Boolean),
  }),
  model: Schema.Struct({
    collapsed: Schema.Boolean,
  }),
  message: SectionDisclosureMessage,
}).make({
  init: ($) => $.set({ collapsed: $.props.defaultCollapsed ?? false }),
  update: {
    Toggled: ($) => $.evolve({ collapsed: (current) => !current }),
  },
  parts: (p, model) => {
    const contentId = p.id("content");
    return {
      collapsed: model.collapsed,
      contentId,
      trigger: p.part("button", (b) =>
        b
          .attrs({
            type: "button",
            "aria-controls": contentId,
            "aria-expanded": model.collapsed ? "false" : "true",
          })
          .on("click", SectionDisclosureMessage.Toggled()),
      ),
    };
  },
});

export type SectionOptions<M, R = never> = {
  readonly key?: string | undefined;
  /** Primary heading shown in the section header. */
  readonly title: string;
  readonly description?: string | undefined;
  /** Right-aligned slot in the title row (e.g. Reset). */
  readonly headerAction?: View.Input<M, R> | undefined;
  readonly children?: View.Input<M, R> | undefined;
  readonly class?: string | undefined;
  readonly headerClassName?: string | undefined;
  readonly contentClassName?: string | undefined;
  /** Initial collapsed state for locally managed section disclosure. */
  readonly defaultCollapsed?: boolean | undefined;
  /**
   * Caret axis for expand/collapse.
   * `vertical` (side panels): up/down. `horizontal` (dock): left/right.
   */
  readonly chevron?: SectionChevron | undefined;
  /** `rail` opts into the unboxed instrument-rail treatment inside `.lisca-instrument-shell`. */
  readonly appearance?: "framed" | "rail" | undefined;
};

export type SectionProps<M = never, R = never> = SectionOptions<M, R>;

export function Section<M, R = never>(h: Html.H<M>, options: SectionOptions<M, R>) {
  const chevron = options.chevron ?? "vertical";
  const appearance = options.appearance ?? "framed";
  const isRail = appearance === "rail";

  return SectionDisclosure(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      ...(options.defaultCollapsed !== undefined
        ? { defaultCollapsed: options.defaultCollapsed }
        : {}),
    },
    view: (section) => {
      let panel = Panel(h, {
        class: cn(isRail && "gap-2", options.class),
      }).attr("data-section-appearance", appearance);

      if (section.collapsed) {
        panel = panel.attr("data-collapsed", "");
      }

      const caretName =
        chevron === "horizontal"
          ? section.collapsed
            ? "caret-right"
            : "caret-left"
          : section.collapsed
            ? "caret-down"
            : "caret-up";

      return panel.children(
        PanelHeader(h, {
          class: cn(
            isRail ? "space-y-2" : cn("space-y-1 px-2.5", section.collapsed ? "py-2" : "pt-2 pb-0"),
            options.headerClassName,
          ),
        }).children(
          h.div.class("flex items-center gap-1").children(
            section
              .trigger(h.button)
              .attr("data-slot", "section-trigger")
              .class(
                cn(
                  "flex min-w-0 flex-1 items-center justify-between gap-2 text-left outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring",
                  isRail ? "rounded-sm text-sm leading-5" : "rounded-md py-1 text-sm",
                ),
              )
              .children(
                h.span
                  .attr("data-slot", "section-title")
                  .class(
                    cn(
                      "min-w-0 truncate font-display font-semibold",
                      isRail ? "leading-5" : "leading-none",
                    ),
                  )
                  .children(options.title),
                h.span
                  .attr("aria-hidden", "true")
                  .class("shrink-0 text-muted-foreground")
                  .children(Icon(h, caretName, { class: isRail ? "size-3" : "size-3.5" })),
              ),
            options.headerAction !== undefined
              ? h.div.class("flex shrink-0 items-center gap-1").children(options.headerAction)
              : undefined,
          ),
          options.description !== undefined
            ? PanelDescription(h, {
                class: isRail ? "text-xs leading-4" : "text-xs",
              })
                .attr("data-slot", "section-description")
                .children(options.description)
            : undefined,
        ),
        !section.collapsed
          ? PanelContent(h, {
              class: cn(
                isRail ? "space-y-2" : "space-y-2 px-2.5 pb-2.5 pt-2",
                options.contentClassName,
              ),
            })
              .attr("id", section.contentId)
              .children(options.children)
          : undefined,
      );
    },
  });
}
