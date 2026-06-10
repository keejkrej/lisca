import { Button } from "../../components/ui/button";
import type { ReactNode } from "react";

/** Basename path control (`Button` outline; matches shell chrome). */
export function PathButton(props: {
  label: string;
  value: string | null;
  icon: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const display = props.value
    ? props.value
        .split(/[\\/]/)
        .findLast((part) => part.length > 0)
        ?.replace(/\.[^./\\]+$/, "")
    : null;

  const disabled = props.disabled ?? !props.onClick;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      title={props.value ? props.value : props.label}
      onClick={() => {
        if (!disabled) props.onClick?.();
      }}
      className="max-w-[min(100%,18rem)] justify-start gap-2 font-normal"
    >
      <span className="shrink-0">{props.icon}</span>
      <span className="min-w-0 truncate">{display ?? props.label}</span>
    </Button>
  );
}
