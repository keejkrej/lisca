import IconCircleNotchRegular from "phosphor-icons-solid/IconCircleNotchRegular";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../../lib/utils";

type SpinnerProps = ComponentProps<"span"> & {
  class?: string | undefined;
};

const Spinner = (props: SpinnerProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      role="status"
      aria-label="Loading"
      class={cn("z-spinner inline-flex size-4 animate-spin", local.class)}
      data-slot="spinner"
      {...others}
    >
      <IconCircleNotchRegular />
    </span>
  );
};

export { Spinner };
