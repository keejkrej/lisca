import { cn } from "../../lib/utils";

const pathChipClass = "rounded-md border border-border bg-muted/20 text-foreground";

export function ReadonlyPathField(props: { value: string; class?: string; "aria-label"?: string }) {
  return (
    <div
      aria-label={props["aria-label"] ?? `Path ${props.value}`}
      class={cn(
        "flex h-8 w-full min-w-0 items-center self-stretch truncate px-2 font-mono text-xs",
        pathChipClass,
        props.class,
      )}
      title={props.value}
    >
      {props.value}
    </div>
  );
}
