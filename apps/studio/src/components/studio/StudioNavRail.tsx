import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudioStep } from "../../studioStore";
import { useStudioStore } from "../../studioStore";

/** Left rail labels match Figma (Page 2 appshell). */
const ITEMS: { id: string; label: string }[] = [
  { id: "choose-assay", label: "Choose assay" },
  { id: "basic-info", label: "Basic info" },
  { id: "align-pattern", label: "Align pattern" },
  { id: "inspect-roi", label: "Inspect ROI" },
  { id: "run-analysis", label: "Run analysis" },
  { id: "view-results", label: "View results" },
];

const STEP_TO_ACTIVE: Record<StudioStep, (typeof ITEMS)[number]["id"]> = {
  welcome: "choose-assay",
  info1: "basic-info",
  info2: "align-pattern",
};

/** Nav items that map to implemented `StudioStep` values. */
const NAV_ID_TO_STEP: Partial<Record<string, StudioStep>> = {
  "choose-assay": "welcome",
  "basic-info": "info1",
  "align-pattern": "info2",
};

type StudioNavRailProps = {
  className?: string;
};

export function StudioNavRail({ className }: StudioNavRailProps) {
  const step = useStudioStore((s) => s.step);
  const setStep = useStudioStore((s) => s.setStep);
  const activeId = STEP_TO_ACTIVE[step];

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex w-60 min-w-60 flex-col gap-1 border-r border-border/80 bg-card/32 px-2.5 py-4",
        className,
      )}
    >
      {ITEMS.map((item) => {
        const isActive = item.id === activeId;
        const targetStep = NAV_ID_TO_STEP[item.id];
        const isNavigable = targetStep !== undefined;

        return (
          <Button
            key={item.id}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "h-12 w-full justify-start",
              isActive && "border-l-2 border-primary bg-accent/40 pl-[calc(0.625rem-2px)]",
              !isNavigable && "cursor-not-allowed opacity-50",
            )}
            data-active={isActive ? true : undefined}
            disabled={!isNavigable}
            type="button"
            variant="ghost"
            onClick={() => {
              if (targetStep !== undefined) {
                setStep(targetStep);
              }
            }}
          >
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}
