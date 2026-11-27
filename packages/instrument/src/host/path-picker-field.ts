import type { Html } from "@effect/ui/html";
import { Button } from "@lisca/ui/button";
import { cn } from "@lisca/ui/cn";
import { Field, FieldLabel } from "@lisca/ui/field";

export type PathPickerFieldOptions<M> = {
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly actionLabel?: string | undefined;
  readonly onOpen: M;
};

export type PathPickerFieldProps<M = never> = PathPickerFieldOptions<M>;

/** Shared surface for path-valued triggers (dialog or menu). */
export const pathPickerTriggerClass =
  "h-8 w-full min-w-0 justify-between gap-3 !bg-input/30 px-3 hover:!bg-input/50";

export function PathPickerTriggerContent<M>(
  h: Html.H<M>,
  options: {
    readonly value: string;
    readonly placeholder: string;
    readonly actionLabel: string;
  },
) {
  return [
    h.span
      .class(
        cn(
          "min-w-0 flex-1 truncate text-left",
          options.value.trim()
            ? "font-mono text-xs text-foreground"
            : "text-[13px] font-normal text-muted-foreground",
        ),
      )
      .children(options.value.trim() || options.placeholder),
    h.span.class("shrink-0 text-[13px] font-medium text-foreground").children(options.actionLabel),
  ];
}

export function pathPickerAccessibleName(
  label: string,
  value: string,
  placeholder: string,
  action: string,
): string {
  const shown = value.trim() || placeholder.trim();
  return shown ? `${label}: ${shown}. ${action}` : `${label}. ${action}`;
}

/** A read-only path value whose whole surface opens a picker dialog. */
export function PathPickerField<M>(h: Html.H<M>, options: PathPickerFieldOptions<M>) {
  const actionLabel = options.actionLabel ?? "Browse";
  const title = options.value.trim() || options.placeholder.trim() || undefined;

  return Field(h, { class: "w-full gap-2" }).children(
    FieldLabel(h, { class: "text-sm font-medium leading-[18px]", for: options.id }).children(
      options.label,
    ),
    Button(h, {
      ariaLabel: pathPickerAccessibleName(
        options.label,
        options.value,
        options.placeholder,
        actionLabel,
      ),
      class: pathPickerTriggerClass,
      size: "sm",
      title,
      type: "button",
      variant: "outline",
      onPress: options.onOpen,
    })
      .attr("aria-haspopup", "dialog")
      .attr("id", options.id)
      .children(
        PathPickerTriggerContent(h, {
          actionLabel,
          placeholder: options.placeholder,
          value: options.value,
        }),
      ),
  );
}
