import { ContextMenu } from "@base-ui/react/context-menu";
import { Button } from "@/components/ui/button";
import { MenuItem, MenuPopup } from "@/components/ui/menu";
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
  info2: "basic-info",
  alignPattern: "align-pattern",
};

const NAV_ID_TO_STEP: Partial<Record<string, StudioStep>> = {
  "choose-assay": "welcome",
  "basic-info": "info1",
  "align-pattern": "alignPattern",
};

/** Shown in the sub-step context menu; only for nav ids with more than one `StudioStep`. */
const NAV_SUBSTEPS: Partial<Record<string, { step: StudioStep; label: string }[]>> = {
  "basic-info": [
    { step: "info1", label: "Step 1" },
    { step: "info2", label: "Step 2" },
  ],
};

const itemButtonClass = (isActive: boolean) =>
  cn(
    "h-auto min-w-0 max-w-full rounded-2xl px-5 py-2.5 text-2xl font-medium",
    isActive ? "text-foreground" : "text-muted-foreground",
  );

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
        "flex h-full min-h-0 w-60 min-w-60 flex-col items-center justify-center gap-[30px] border-r border-border/80 bg-card/32 p-2.5",
        className,
      )}
    >
      {ITEMS.map((item) => {
        const isActive = item.id === activeId;
        const targetStep = NAV_ID_TO_STEP[item.id];
        const isNavigable = targetStep !== undefined;
        const subSteps = NAV_SUBSTEPS[item.id];
        const hasSubMenu = isNavigable && (subSteps?.length ?? 0) > 1;

        if (!isNavigable) {
          return (
            <Button
              key={item.id}
              className={cn(
                "h-auto w-auto min-w-0 max-w-full rounded-2xl px-5 py-2.5 text-2xl font-medium",
                isActive ? "text-foreground" : "text-muted-foreground",
                "cursor-not-allowed opacity-50",
              )}
              data-active={isActive ? true : undefined}
              disabled
              type="button"
              variant="ghost"
            >
              {item.label}
            </Button>
          );
        }

        if (!hasSubMenu) {
          return (
            <Button
              key={item.id}
              aria-current={isActive ? "page" : undefined}
              className={cn("w-auto", itemButtonClass(isActive))}
              data-active={isActive ? true : undefined}
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
        }

        return (
          <ContextMenu.Root key={item.id}>
            <ContextMenu.Trigger
              className="flex w-full min-w-0 max-w-full justify-center outline-none"
            >
              <Button
                aria-current={isActive ? "page" : undefined}
                className={cn("w-full", itemButtonClass(isActive))}
                data-active={isActive ? true : undefined}
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
            </ContextMenu.Trigger>
            <MenuPopup align="start" className="min-w-48" side="right" sideOffset={6}>
              {subSteps?.map((s) => (
                <MenuItem
                  key={s.step}
                  className={cn(step === s.step && "bg-accent/60")}
                  onClick={() => {
                    setStep(s.step);
                  }}
                >
                  {s.label}
                </MenuItem>
              ))}
            </MenuPopup>
          </ContextMenu.Root>
        );
      })}
    </nav>
  );
}
