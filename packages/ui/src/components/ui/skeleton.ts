import type { Html } from "@effect/ui/html";

import { cn } from "../../lib/utils";

export function Skeleton<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.div.attr("data-slot", "skeleton").class(cn("z-skeleton animate-pulse", options.class));
}
