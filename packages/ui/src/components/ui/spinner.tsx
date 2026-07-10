import IconCircleNotchRegular from "phosphor-icons-solid/IconCircleNotchRegular";
import { splitProps, type JSX } from "solid-js";

import { cn } from "../../lib/utils";

export function Spinner(props: { class?: string }): JSX.Element {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <span aria-label="Loading" class={cn("inline-flex animate-spin", local.class)} role="status" {...rest}>
      <IconCircleNotchRegular />
    </span>
  );
}