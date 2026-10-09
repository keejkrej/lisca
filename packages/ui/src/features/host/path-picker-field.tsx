import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { cn } from "../../lib/utils";

export type PathPickerFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  actionLabel?: string;
  onOpen: () => void;
};

/** Shared surface for path-valued triggers (dialog or menu). */
export const pathPickerTriggerClass =
  "h-8 w-full min-w-0 justify-between gap-3 !bg-input/30 px-3 hover:!bg-input/50";

export function PathPickerTriggerContent(props: {
  value: string;
  placeholder: string;
  actionLabel: string;
}) {
  return (
    <>
      <span
        class={cn(
          "min-w-0 flex-1 truncate text-left",
          props.value.trim()
            ? "font-mono text-xs text-foreground"
            : "text-[13px] font-normal text-muted-foreground",
        )}
      >
        {props.value.trim() || props.placeholder}
      </span>
      <span class="shrink-0 text-[13px] font-medium text-foreground">{props.actionLabel}</span>
    </>
  );
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
export function PathPickerField(props: PathPickerFieldProps) {
  const actionLabel = () => props.actionLabel ?? "Browse";

  return (
    <Field class="w-full gap-2">
      <FieldLabel class="text-sm font-medium leading-[18px]" for={props.id}>
        {props.label}
      </FieldLabel>
      <Button
        aria-haspopup="dialog"
        aria-label={pathPickerAccessibleName(
          props.label,
          props.value,
          props.placeholder,
          actionLabel(),
        )}
        class={pathPickerTriggerClass}
        id={props.id}
        size="sm"
        title={props.value.trim() || props.placeholder.trim() || undefined}
        type="button"
        variant="outline"
        onClick={props.onOpen}
      >
        <PathPickerTriggerContent
          actionLabel={actionLabel()}
          placeholder={props.placeholder}
          value={props.value}
        />
      </Button>
    </Field>
  );
}
