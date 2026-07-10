import { Loader2 } from "lucide-solid";
import { splitProps, type ComponentProps, type JSX } from "solid-js";

import { cn } from "../../lib/utils";

export function Spinner(props: ComponentProps<typeof Loader2>): JSX.Element {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <Loader2
      aria-label="Loading"
      class={cn("animate-spin", local.class)}
      role="status"
      {...rest}
    />
  );
}