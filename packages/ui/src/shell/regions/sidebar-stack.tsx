import { splitProps, type JSX } from "solid-js";

import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { regionInsetClass, regionStackGapClass } from "./region-spacing";

export type SidebarStackProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> & {
  children?: JSX.Element;
};

export function SidebarStack(props: SidebarStackProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <ScrollArea
      class="h-full w-full min-h-0"
      contentClass={cn(
        "flex flex-col items-stretch",
        regionInsetClass,
        regionStackGapClass,
        local.class,
      )}
      viewportClass="overscroll-none"
      {...rest}
    >
      {local.children}
    </ScrollArea>
  );
}
