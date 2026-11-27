import type { Html } from "@effect/ui/html";

import { cn } from "../../lib/utils";

export type SidebarDivOptions = {
  readonly class?: string | undefined;
};

/** Static navigation layout used by Settings. Interaction stays in native buttons. */
export function SidebarProvider<M>(h: Html.H<M>, options: SidebarDivOptions = {}) {
  return h.div
    .attr("data-slot", "sidebar-wrapper")
    .style({ "--sidebar-width": "16rem" })
    .class(cn("group/sidebar-wrapper flex w-full", options.class));
}

export function Sidebar<M>(h: Html.H<M>, options: SidebarDivOptions = {}) {
  return h.div
    .attr("data-slot", "sidebar")
    .class(
      cn(
        "flex h-full w-(--sidebar-width) shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        options.class,
      ),
    );
}

export function SidebarInset<M>(h: Html.H<M>, options: SidebarDivOptions = {}) {
  return h.div
    .attr("data-slot", "sidebar-inset")
    .class(cn("relative z-sidebar-inset flex w-full flex-1 flex-col", options.class));
}

export function SidebarContent<M>(h: Html.H<M>, options: SidebarDivOptions = {}) {
  return h.div
    .attr("data-slot", "sidebar-content")
    .attr("data-sidebar", "content")
    .class(cn("z-sidebar-content flex min-h-0 flex-1 flex-col overflow-auto", options.class));
}

export function SidebarGroup<M>(h: Html.H<M>, options: SidebarDivOptions = {}) {
  return h.div
    .attr("data-slot", "sidebar-group")
    .attr("data-sidebar", "group")
    .class(cn("relative z-sidebar-group flex w-full min-w-0 flex-col", options.class));
}

export function SidebarGroupContent<M>(h: Html.H<M>, options: SidebarDivOptions = {}) {
  return h.div
    .attr("data-slot", "sidebar-group-content")
    .attr("data-sidebar", "group-content")
    .class(cn("z-sidebar-group-content w-full", options.class));
}

export function SidebarMenu<M>(h: Html.H<M>, options: SidebarDivOptions = {}) {
  return h.ul
    .attr("data-slot", "sidebar-menu")
    .attr("data-sidebar", "menu")
    .class(cn("z-sidebar-menu flex w-full min-w-0 flex-col", options.class));
}

export function SidebarMenuItem<M>(h: Html.H<M>, options: SidebarDivOptions = {}) {
  return h.li
    .attr("data-slot", "sidebar-menu-item")
    .attr("data-sidebar", "menu-item")
    .class(cn("group/menu-item relative", options.class));
}

export type SidebarMenuButtonOptions<M> = {
  readonly class?: string | undefined;
  readonly isActive?: boolean | undefined;
  readonly onClick?: M | undefined;
};

export function SidebarMenuButton<M>(h: Html.H<M>, options: SidebarMenuButtonOptions<M> = {}) {
  let builder = h.button
    .attr("type", "button")
    .attr("data-slot", "sidebar-menu-button")
    .attr("data-sidebar", "menu-button")
    .attr("data-active", options.isActive ? "true" : "false")
    .attr("data-size", "default")
    .class(
      cn(
        "peer/menu-button group/menu-button z-sidebar-menu-button z-sidebar-menu-button-variant-default z-sidebar-menu-button-size-default flex w-full items-center overflow-hidden outline-hidden disabled:pointer-events-none disabled:opacity-50 [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0",
        options.class,
      ),
    );

  if (options.onClick !== undefined) {
    builder = builder.on("click", options.onClick);
  }
  return builder;
}
