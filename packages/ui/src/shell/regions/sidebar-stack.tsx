import { splitProps, type JSX } from "solid-js";

import { cn } from "../../lib/utils";

export type SidebarStackProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> & {
  children?: JSX.Element;
};

export function SidebarStack(props: SidebarStackProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("flex min-h-0 flex-col gap-2 overflow-auto p-3", local.class)} {...rest}>
      {local.children}
    </div>
  );
}