import { splitProps, type JSX } from "solid-js";

import { cn } from "../../lib/utils";

/** Bordered in-app frame (dock, viewport, nav rail). Shell-internal; use Panel/ViewportCard in apps. */
export const panelFrameClass =
  "rounded-xl border border-border bg-background text-foreground shadow-none";

export function Panel(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("relative flex flex-col", panelFrameClass, local.class)}
      data-slot="panel"
      {...rest}
    />
  );
}

export function PanelHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={cn("shrink-0", local.class)} data-slot="panel-header" {...rest} />;
}

export function PanelTitle(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("font-display font-semibold leading-none", local.class)}
      data-slot="panel-title"
      {...rest}
    />
  );
}

export function PanelDescription(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("text-muted-foreground text-sm", local.class)}
      data-slot="panel-description"
      {...rest}
    />
  );
}

export function PanelContent(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={cn("min-h-0 flex-1", local.class)} data-slot="panel-content" {...rest} />;
}