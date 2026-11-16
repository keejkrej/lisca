import { splitProps, type ComponentProps, type JSX } from "solid-js";
import { cn } from "../../lib/utils";

/** Static navigation layout used by Settings. Interaction stays in native buttons. */
export function SidebarProvider(props: ComponentProps<"div"> & { shortcut?: false }) {
  const [local, others] = splitProps(props, ["class", "style", "shortcut"]);
  return (
    <div
      data-slot="sidebar-wrapper"
      class={cn("group/sidebar-wrapper flex w-full", local.class)}
      style={{ "--sidebar-width": "16rem", ...(local.style as JSX.CSSProperties) }}
      {...others}
    />
  );
}

export function Sidebar(props: ComponentProps<"div"> & { collapsible?: "none" }) {
  const [local, others] = splitProps(props, ["class", "collapsible"]);
  return (
    <div
      data-slot="sidebar"
      class={cn(
        "flex h-full w-(--sidebar-width) shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        local.class,
      )}
      {...others}
    />
  );
}

export function SidebarInset(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sidebar-inset"
      class={cn("relative z-sidebar-inset flex w-full flex-1 flex-col", local.class)}
      {...others}
    />
  );
}

export function SidebarContent(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      class={cn("z-sidebar-content flex min-h-0 flex-1 flex-col overflow-auto", local.class)}
      {...others}
    />
  );
}

export function SidebarGroup(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      class={cn("relative z-sidebar-group flex w-full min-w-0 flex-col", local.class)}
      {...others}
    />
  );
}

export function SidebarGroupContent(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      class={cn("z-sidebar-group-content w-full", local.class)}
      {...others}
    />
  );
}

export function SidebarMenu(props: ComponentProps<"ul">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      class={cn("z-sidebar-menu flex w-full min-w-0 flex-col", local.class)}
      {...others}
    />
  );
}

export function SidebarMenuItem(props: ComponentProps<"li">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      class={cn("group/menu-item relative", local.class)}
      {...others}
    />
  );
}

export function SidebarMenuButton(props: ComponentProps<"button"> & { isActive?: boolean }) {
  const [local, others] = splitProps(props, ["class", "isActive"]);
  return (
    <button
      type="button"
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-active={local.isActive ?? false}
      data-size="default"
      class={cn(
        "peer/menu-button group/menu-button z-sidebar-menu-button z-sidebar-menu-button-variant-default z-sidebar-menu-button-size-default flex w-full items-center overflow-hidden outline-hidden disabled:pointer-events-none disabled:opacity-50 [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0",
        local.class,
      )}
      {...others}
    />
  );
}
