import { splitProps, type JSX } from "solid-js";

import { cn } from "../../lib/utils";

export function StatTile(
  props: {
    label: JSX.Element;
    value: JSX.Element;
  } & Omit<JSX.HTMLAttributes<HTMLDivElement>, "children">,
) {
  const [local, rest] = splitProps(props, ["label", "value", "class"]);
  return (
    <div
      class={cn("rounded-md border border-border bg-background px-2 py-2", local.class)}
      {...rest}
    >
      <div class="text-muted-foreground text-xs">{local.label}</div>
      <div class="mt-1 font-medium tabular-nums">{local.value}</div>
    </div>
  );
}