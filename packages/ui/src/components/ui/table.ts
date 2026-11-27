import type { Html } from "@effect/ui/html";

import { cn } from "../../lib/utils";

export function Table<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.table
    .attr("data-slot", "table")
    .class(cn("z-table", options.class))
    .forward((table) =>
      h.div.attr("data-slot", "table-container").class("z-table-container").children(table),
    );
}

export function TableHeader<M>(
  h: Html.H<M>,
  options: { readonly class?: string | undefined } = {},
) {
  return h.thead.attr("data-slot", "table-header").class(cn("z-table-header", options.class));
}

export function TableBody<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.tbody.attr("data-slot", "table-body").class(cn("z-table-body", options.class));
}

export function TableFooter<M>(
  h: Html.H<M>,
  options: { readonly class?: string | undefined } = {},
) {
  return h.tfoot.attr("data-slot", "table-footer").class(cn("z-table-footer", options.class));
}

export function TableRow<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.tr
    .attr("data-slot", "table-row")
    .class(cn("z-table-row has-aria-expanded:bg-muted/50", options.class));
}

export function TableHead<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.th.attr("data-slot", "table-head").class(cn("z-table-head", options.class));
}

export function TableCell<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.td.attr("data-slot", "table-cell").class(cn("z-table-cell", options.class));
}

export function TableCaption<M>(
  h: Html.H<M>,
  options: { readonly class?: string | undefined } = {},
) {
  return h.caption.attr("data-slot", "table-caption").class(cn("z-table-caption", options.class));
}
