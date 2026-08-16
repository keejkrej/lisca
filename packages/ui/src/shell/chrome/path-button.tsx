import type { JSX } from "solid-js";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

/** Basename path control (`Button` outline; matches shell chrome). */
export function PathButton(props: {
  label: string;
  value: string | null;
  icon?: JSX.Element;
  appearance?: "default" | "stage";
  preserveExtension?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const display = () => {
    const basename = props.value?.split(/[\\/]/).findLast((part) => part.length > 0);
    if (!basename) return null;
    return props.preserveExtension ? basename : basename.replace(/\.[^./\\]+$/, "");
  };

  const disabled = () => props.disabled ?? !props.onClick;

  return (
    <Button
      type="button"
      variant={props.appearance === "stage" ? "ghost" : "outline"}
      size="sm"
      disabled={disabled()}
      title={props.value ? props.value : props.label}
      onClick={() => {
        if (!disabled()) props.onClick?.();
      }}
      class={cn(
        "max-w-[min(100%,18rem)] justify-start gap-2 font-normal",
        props.appearance === "stage" && "h-8 rounded-full border-0 px-2.5 shadow-none",
      )}
    >
      {props.appearance === "stage" ? (
        <>
          <span class="shrink-0 text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
            {props.label}
          </span>
          <span class="min-w-0 truncate text-xs text-foreground">{display() ?? "Not set"}</span>
        </>
      ) : (
        <>
          <span class="shrink-0">{props.icon}</span>
          <span class="min-w-0 truncate">{display() ?? props.label}</span>
        </>
      )}
    </Button>
  );
}
