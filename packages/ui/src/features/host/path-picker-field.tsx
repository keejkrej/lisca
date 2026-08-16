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

/** A read-only path value whose whole surface opens a picker dialog. */
export function PathPickerField(props: PathPickerFieldProps) {
  const actionLabel = () => props.actionLabel ?? "Browse";
  const displayValue = () => props.value.trim() || props.placeholder;

  return (
    <Field class="w-full gap-2">
      <FieldLabel class="text-sm font-medium leading-[18px]" for={props.id}>
        {props.label}
      </FieldLabel>
      <Button
        aria-haspopup="dialog"
        aria-label={`${props.label}: ${displayValue()}. ${actionLabel()}`}
        class="h-8 w-full min-w-0 justify-between gap-3 rounded-full !bg-input/30 px-3 hover:!bg-input/50"
        id={props.id}
        size="sm"
        title={props.value.trim() || props.placeholder}
        type="button"
        variant="outline"
        onClick={props.onOpen}
      >
        <span
          class={cn(
            "min-w-0 flex-1 truncate text-left",
            props.value.trim()
              ? "font-mono text-xs text-foreground"
              : "text-[13px] font-normal text-muted-foreground",
          )}
        >
          {displayValue()}
        </span>
        <span class="shrink-0 text-[13px] font-medium text-foreground">{actionLabel()}</span>
      </Button>
    </Field>
  );
}
