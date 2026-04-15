import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { Button } from "lisca/shared/ui";

function pathBaseName(path: string | null) {
  if (!path) return null;
  const segments = path.split(/[\\/]/).filter(Boolean);
  return segments.at(-1) ?? path;
}

export function ContextSummary({
  label,
  value,
  icon,
  badge,
  onClick,
  disabled = false,
  action,
}: {
  label: string;
  value: string | null;
  icon: ReactNode;
  badge?: string | null;
  onClick?: () => void;
  disabled?: boolean;
  action?: ReactNode;
}) {
  const baseName = pathBaseName(value);
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled || !onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onClick?.();
      }}
      onKeyDown={handleKeyDown}
      className={[
        "min-w-0 max-w-[22rem] rounded-xl border border-border/55 bg-muted/15 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled
          ? "cursor-default opacity-65"
          : "cursor-pointer hover:border-border/80 hover:bg-muted/25",
      ].join(" ")}
      title={value ?? `${label} not selected`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="shrink-0 text-muted-foreground/70">{icon}</div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
            {label}
          </span>
          <p className="truncate text-sm text-foreground/90">{baseName ?? "Not selected"}</p>
          {badge ? (
            <span className="shrink-0 rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function ClearContextAction({
  onClick,
  label,
}: {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  label: string;
}) {
  return (
    <Button
      size="icon-xs"
      variant="ghost"
      className="rounded-full"
      aria-label={label}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
