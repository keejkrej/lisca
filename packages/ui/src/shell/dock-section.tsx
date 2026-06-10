import { cn } from "../lib/utils";
import { Section, type SectionProps } from "./section";

export type DockSectionFit = "hug" | "panel";

export type DockSectionProps = Omit<SectionProps, "className" | "contentClassName"> & {
  className?: string;
  contentClassName?: string;
  /** `hug` (default) shrinks to content; `panel` uses a stable instruction band. */
  fit?: DockSectionFit;
};

export function DockSection({
  className,
  contentClassName,
  children,
  fit = "hug",
  ...sectionProps
}: DockSectionProps) {
  return (
    <Section
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col",
        fit === "panel" ? "min-w-56 max-w-xs" : "w-max max-w-full",
        className,
      )}
      contentClassName={cn("flex min-h-0 flex-1 flex-col justify-center gap-2", contentClassName)}
      {...sectionProps}
    >
      {children}
    </Section>
  );
}
