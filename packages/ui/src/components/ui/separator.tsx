import { splitProps, type ComponentProps } from "solid-js";
import { cn } from "../../lib/utils";

type SeparatorProps = ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
};

const Separator = (props: SeparatorProps) => {
  const [local, others] = splitProps(props, ["class", "orientation", "decorative"]);
  return (
    <div
      data-slot="separator"
      data-orientation={local.orientation ?? "horizontal"}
      role={local.decorative ? "none" : "separator"}
      aria-orientation={local.decorative ? undefined : (local.orientation ?? "horizontal")}
      class={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px",
        local.class,
      )}
      {...others}
    />
  );
};

export { Separator, type SeparatorProps };
