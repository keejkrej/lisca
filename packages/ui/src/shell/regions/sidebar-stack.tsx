import { splitProps, type JSX } from "solid-js";

import { cn } from "../../lib/utils";
import { regionInsetClass, regionStackGapClass } from "./region-spacing";

export type SidebarStackProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> & {
  children?: JSX.Element;
};

export function SidebarStack(props: SidebarStackProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={cn(
        "flex h-full w-full min-h-0 flex-col items-stretch overflow-auto",
        regionInsetClass,
        regionStackGapClass,
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}
