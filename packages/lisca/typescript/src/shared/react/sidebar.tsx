import { type ReactNode } from "react";

import { ToggleGroup, ToggleGroupItem, cn } from "lisca/shared/ui";

export function SidebarSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {action}
      </div>
      <div className="min-w-0 space-y-3">{children}</div>
    </section>
  );
}

export function SidebarField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {hint ? <span className="text-xs text-muted-foreground/80">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function SidebarValue({
  children,
  className,
  tone = "muted",
  monospace = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted";
  monospace?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card px-3 py-2 text-sm",
        tone === "default" ? "text-foreground" : "text-muted-foreground",
        monospace && "min-w-0 overflow-x-auto overflow-y-hidden font-mono text-[13px] [scrollbar-width:thin]",
        className,
      )}
    >
      {monospace ? (
        <span className="inline-block max-w-none whitespace-nowrap">{children}</span>
      ) : (
        children
      )}
    </div>
  );
}

export function SidebarStat({
  value,
  tone = "default",
}: {
  value: number | string;
  tone?: "default" | "info" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-3 py-2 text-sm font-medium",
        tone === "default" && "border-border text-foreground",
        tone === "info" && "border-sky-400/25 bg-sky-400/8 text-sky-200",
        tone === "danger" && "border-rose-400/25 bg-rose-400/8 text-rose-200",
      )}
    >
      {value}
    </div>
  );
}

export function SidebarSegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  disabled,
  compact = false,
}: {
  value: T;
  options: readonly { label: string; value: T }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <ToggleGroup
      multiple={false}
      value={[value]}
      disabled={disabled}
      onValueChange={(next) => {
        const selected = next[0];
        if (selected) onChange(selected as T);
      }}
    >
      {options.map((option) => {
        return (
          <ToggleGroupItem
            key={option.value}
            className={compact ? "min-w-0 flex-1 px-2 text-xs" : "min-w-[4.5rem]"}
            value={option.value}
          >
            {option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
