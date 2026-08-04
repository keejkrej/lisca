import IconCaretDownRegular from "phosphor-icons-solid/IconCaretDownRegular";
import IconCaretLeftRegular from "phosphor-icons-solid/IconCaretLeftRegular";
import IconCaretRightRegular from "phosphor-icons-solid/IconCaretRightRegular";
import IconCaretUpRegular from "phosphor-icons-solid/IconCaretUpRegular";
import { createSignal, createUniqueId, Show, splitProps, type JSX } from "solid-js";

import { cn } from "../../lib/utils";
import { Panel, PanelContent, PanelDescription, PanelHeader } from "./panel";

export type SectionChevron = "vertical" | "horizontal";

export type SectionProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "title" | "children"> & {
  /** Primary heading shown in the section header. */
  title: string;
  description?: string;
  /** Right-aligned slot in the title row (e.g. Reset). */
  headerAction?: JSX.Element;
  children?: JSX.Element;
  headerClassName?: string;
  contentClassName?: string;
  /** Initial collapsed state for locally managed section disclosure. */
  defaultCollapsed?: boolean;
  /**
   * Caret axis for expand/collapse.
   * `vertical` (side panels): up/down. `horizontal` (dock): left/right.
   */
  chevron?: SectionChevron;
};

export function Section(props: SectionProps) {
  const [local, panelProps] = splitProps(props, [
    "title",
    "description",
    "headerAction",
    "children",
    "class",
    "headerClassName",
    "contentClassName",
    "defaultCollapsed",
    "chevron",
  ]);
  const contentId = createUniqueId();
  const [collapsed, setCollapsed] = createSignal(local.defaultCollapsed ?? false);
  const chevron = () => local.chevron ?? "vertical";
  const toggle = () => setCollapsed((current) => !current);

  return (
    <Panel
      class={local.class}
      data-collapsed={collapsed() ? "" : undefined}
      {...panelProps}
    >
      <PanelHeader
        class={cn(
          "space-y-1 px-2.5",
          collapsed() ? "py-2" : "pt-2 pb-0",
          local.headerClassName,
        )}
      >
        <div class="flex items-center gap-1">
          {/* Accordion-style trigger: hover underline, no sticky expanded fill (unlike ghost Button). */}
          <button
            aria-controls={contentId}
            aria-expanded={!collapsed()}
            class="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md py-1 text-left text-sm outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
            onClick={toggle}
          >
            <span class="min-w-0 truncate font-display font-semibold leading-none">
              {local.title}
            </span>
            <span aria-hidden="true" class="shrink-0 text-muted-foreground">
              <Show
                when={chevron() === "horizontal"}
                fallback={
                  <Show when={collapsed()} fallback={<IconCaretUpRegular class="size-3.5" />}>
                    <IconCaretDownRegular class="size-3.5" />
                  </Show>
                }
              >
                <Show when={collapsed()} fallback={<IconCaretLeftRegular class="size-3.5" />}>
                  <IconCaretRightRegular class="size-3.5" />
                </Show>
              </Show>
            </span>
          </button>
          <Show when={local.headerAction}>
            <div class="flex shrink-0 items-center gap-1">{local.headerAction}</div>
          </Show>
        </div>
        <Show when={local.description}>
          <PanelDescription class="text-xs">{local.description}</PanelDescription>
        </Show>
      </PanelHeader>
      <Show when={!collapsed()}>
        <PanelContent
          class={cn("space-y-2 px-2.5 pb-2.5 pt-2", local.contentClassName)}
          id={contentId}
        >
          {local.children}
        </PanelContent>
      </Show>
    </Panel>
  );
}
