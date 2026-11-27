import type { Html } from "@effect/ui/html";

import { cn } from "../../lib/utils";

export type CardOptions = {
  readonly size?: "default" | "sm" | undefined;
  readonly class?: string | undefined;
};

export function Card<M>(h: Html.H<M>, options: CardOptions = {}) {
  return h.div
    .attr("data-slot", "card")
    .attr("data-size", options.size ?? "default")
    .class(cn("group/card z-card flex flex-col", options.class));
}

export function CardHeader<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.div
    .attr("data-slot", "card-header")
    .class(
      cn(
        "group/card-header @container/card-header z-card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        options.class,
      ),
    );
}

export function CardTitle<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.div
    .attr("data-slot", "card-title")
    .class(cn("z-card-title z-font-heading", options.class));
}

export function CardDescription<M>(
  h: Html.H<M>,
  options: { readonly class?: string | undefined } = {},
) {
  return h.div.attr("data-slot", "card-description").class(cn("z-card-description", options.class));
}

export function CardAction<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.div
    .attr("data-slot", "card-action")
    .class(
      cn(
        "z-card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        options.class,
      ),
    );
}

export function CardContent<M>(
  h: Html.H<M>,
  options: { readonly class?: string | undefined } = {},
) {
  return h.div.attr("data-slot", "card-content").class(cn("z-card-content", options.class));
}

export function CardFooter<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.div
    .attr("data-slot", "card-footer")
    .class(cn("z-card-footer flex items-center", options.class));
}
