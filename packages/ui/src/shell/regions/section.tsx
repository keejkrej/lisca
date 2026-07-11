import IconCaretDownRegular from "phosphor-icons-solid/IconCaretDownRegular";
import IconCaretRightRegular from "phosphor-icons-solid/IconCaretRightRegular";
import { createSignal, createUniqueId, Show, splitProps, type JSX } from "solid-js";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from "./panel";

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
  ]);
  const contentId = createUniqueId();
  const [collapsed, setCollapsed] = createSignal(local.defaultCollapsed ?? false);

  return (
    <Panel
      class={local.class}
      data-collapsed={collapsed() ? "" : undefined}
      {...panelProps}
    >
      <PanelHeader
        class={cn("space-y-1.5 px-2.5 py-2.5", !collapsed() && "pb-0", local.headerClassName)}
      >
        <div class="flex items-start justify-between gap-2">
          <PanelTitle class="min-w-0 flex-1 text-sm">{local.title}</PanelTitle>
          <div class="flex shrink-0 items-center gap-1">
            {local.headerAction}
            <Button
              aria-controls={contentId}
              aria-expanded={!collapsed()}
              aria-label={collapsed() ? `Expand ${local.title}` : `Collapse ${local.title}`}
              class="-mr-1 -mt-1"
              size="icon-xs"
              variant="ghost"
              onClick={() => {
                setCollapsed((current) => !current);
              }}
            >
              <Show
                when={collapsed()}
                fallback={<IconCaretDownRegular />}
              >
                <IconCaretRightRegular />
              </Show>
            </Button>
          </div>
        </div>
        <Show when={local.description}>
          <PanelDescription class="text-xs">{local.description}</PanelDescription>
        </Show>
      </PanelHeader>
      <Show when={!collapsed()}>
        <PanelContent class={cn("space-y-2 px-2.5 pb-2.5 pt-2", local.contentClassName)} id={contentId}>
          {local.children}
        </PanelContent>
      </Show>
    </Panel>
  );
}