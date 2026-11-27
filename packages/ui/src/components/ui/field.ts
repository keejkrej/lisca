import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { Label, type LabelOptions } from "./label";
import { Separator } from "./separator";

export type FieldSetOptions = {
  readonly class?: string | undefined;
};

export function FieldSet<M>(h: Html.H<M>, options: FieldSetOptions = {}) {
  return h.fieldset
    .attr("data-slot", "field-set")
    .class(cn("z-field-set flex flex-col", options.class));
}

export type FieldLegendOptions = {
  readonly class?: string | undefined;
  readonly variant?: "legend" | "label" | undefined;
};

export function FieldLegend<M>(h: Html.H<M>, options: FieldLegendOptions = {}) {
  return h.legend
    .attr("data-slot", "field-legend")
    .attr("data-variant", options.variant ?? "legend")
    .class(cn("z-field-legend", options.class));
}

export type FieldGroupOptions = {
  readonly class?: string | undefined;
};

export function FieldGroup<M>(h: Html.H<M>, options: FieldGroupOptions = {}) {
  return h.div
    .attr("data-slot", "field-group")
    .class(
      cn(
        "group/field-group @container/field-group z-field-group flex w-full flex-col",
        options.class,
      ),
    );
}

export const fieldVariants = cva("group/field z-field flex w-full", {
  variants: {
    orientation: {
      vertical: "z-field-orientation-vertical flex-col *:w-full [&>.sr-only]:w-auto",
      horizontal:
        "z-field-orientation-horizontal flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      responsive:
        "z-field-orientation-responsive @md/field-group:flex-row flex-col @md/field-group:items-center *:w-full @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

export type FieldOptions = VariantProps<typeof fieldVariants> & {
  readonly class?: string | undefined;
};

export function Field<M>(h: Html.H<M>, options: FieldOptions = {}) {
  return h.div
    .attr("role", "group")
    .attr("data-slot", "field")
    .attr("data-orientation", options.orientation ?? "vertical")
    .class(cn(fieldVariants({ orientation: options.orientation }), options.class));
}

export type FieldContentOptions = {
  readonly class?: string | undefined;
};

export function FieldContent<M>(h: Html.H<M>, options: FieldContentOptions = {}) {
  return h.div
    .attr("data-slot", "field-content")
    .class(
      cn("group/field-content z-field-content flex flex-1 flex-col leading-snug", options.class),
    );
}

export type FieldLabelOptions = LabelOptions;

export function FieldLabel<M>(h: Html.H<M>, options: FieldLabelOptions = {}) {
  return Label(h, {
    ...options,
    class: cn(
      "group/field-label peer/field-label z-field-label flex w-fit leading-snug",
      "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
      options.class,
    ),
  }).attr("data-slot", "field-label");
}

export type FieldTitleOptions = {
  readonly class?: string | undefined;
};

export function FieldTitle<M>(h: Html.H<M>, options: FieldTitleOptions = {}) {
  return h.div
    .attr("data-slot", "field-label")
    .class(cn("z-field-title z-font-heading flex w-fit items-center leading-snug", options.class));
}

export type FieldDescriptionOptions = {
  readonly class?: string | undefined;
};

export function FieldDescription<M>(h: Html.H<M>, options: FieldDescriptionOptions = {}) {
  return h.p
    .attr("data-slot", "field-description")
    .class(
      cn(
        "z-field-description font-normal leading-normal group-has-data-[orientation=horizontal]/field:text-balance",
        "nth-last-2:-mt-1 last:mt-0",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        options.class,
      ),
    );
}

export type FieldSeparatorOptions<M, R = never> = {
  readonly class?: string | undefined;
  readonly content?: View.Input<M, R> | undefined;
};

export function FieldSeparator<M, R = never>(
  h: Html.H<M>,
  options: FieldSeparatorOptions<M, R> = {},
) {
  const hasContent =
    options.content !== undefined && options.content !== null && options.content !== false;
  return h.div
    .attr("data-slot", "field-separator")
    .attr("data-content", hasContent ? "true" : "false")
    .class(cn("relative z-field-separator", options.class))
    .children(
      Separator(h, { class: "absolute inset-0 top-1/2" }),
      hasContent
        ? h.span
            .attr("data-slot", "field-separator-content")
            .class("relative z-field-separator-content mx-auto block w-fit bg-background")
            .children(options.content)
        : undefined,
    );
}

export type FieldErrorOptions<M, R = never> = {
  readonly class?: string | undefined;
  readonly content?: View.Input<M, R> | undefined;
  readonly errors?:
    | ReadonlyArray<{ readonly message?: string | undefined } | undefined>
    | undefined;
};

export function FieldError<M, R = never>(h: Html.H<M>, options: FieldErrorOptions<M, R> = {}) {
  let resolved: View.Input<M, R> | undefined = options.content;

  if (resolved === undefined && options.errors && options.errors.length > 0) {
    const uniqueErrors = [
      ...new Map(
        options.errors
          .filter((error): error is { readonly message: string } => Boolean(error?.message))
          .map((error) => [error.message, error]),
      ).values(),
    ];

    if (uniqueErrors.length === 1) {
      resolved = uniqueErrors[0]?.message;
    } else if (uniqueErrors.length > 1) {
      resolved = h.ul
        .class("ml-4 flex list-disc flex-col gap-1")
        .children(...uniqueErrors.map((error) => h.li.key(error.message).children(error.message)));
    }
  }

  if (resolved === undefined || resolved === null || resolved === false) {
    return undefined;
  }

  return h.div
    .attr("role", "alert")
    .attr("data-slot", "field-error")
    .class(cn("z-field-error font-normal", options.class))
    .children(resolved);
}
