import { splitProps, type JSX, type ParentProps } from "solid-js";

import { cn } from "../../lib/utils";

export function Field(props: ParentProps<{ class?: string; name?: string }>): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("flex flex-col items-start gap-2", local.class)}
      data-slot="field"
      {...rest}
    >
      {local.children}
    </div>
  );
}

export function FieldLabel(
  props: ParentProps<{ class?: string; id?: string; htmlFor?: string }>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children", "htmlFor"]);

  return (
    <label
      class={cn(
        "inline-flex items-center gap-2 font-medium text-base/4.5 text-foreground data-disabled:opacity-64 sm:text-sm/4",
        local.class,
      )}
      data-slot="field-label"
      for={local.htmlFor}
      {...rest}
    >
      {local.children}
    </label>
  );
}

export function FieldItem(props: ParentProps<{ class?: string }>): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div class={cn("flex", local.class)} data-slot="field-item" {...rest}>
      {local.children}
    </div>
  );
}

export function FieldDescription(props: ParentProps<{ class?: string }>): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <p class={cn("text-muted-foreground text-xs", local.class)} data-slot="field-description" {...rest}>
      {local.children}
    </p>
  );
}

export function FieldError(props: ParentProps<{ class?: string }>): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <p class={cn("text-destructive-foreground text-xs", local.class)} data-slot="field-error" {...rest}>
      {local.children}
    </p>
  );
}

export function FieldControl(props: ParentProps): JSX.Element {
  return props.children as JSX.Element;
}

export function FieldValidity(): null {
  return null;
}

export const FieldPrimitive = {
  Control: FieldControl,
  Description: FieldDescription,
  Error: FieldError,
  Item: FieldItem,
  Label: FieldLabel,
  Root: Field,
  Validity: FieldValidity,
};