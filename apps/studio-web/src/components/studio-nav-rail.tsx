import { Button, cn } from "@lisca/ui";
import { Link } from "@tanstack/react-router";

import type { InfoStep } from "../state/studio-store";

const navButtonClass =
  "h-auto w-auto min-w-0 max-w-full shrink-0 rounded-lg px-5 py-2.5 text-xl font-medium";

function NavButton({
  active,
  children,
  to,
  onClick,
}: {
  active: boolean;
  children: string;
  to: string;
  onClick?: () => void;
}) {
  return (
    <Button
      render={<Link to={to} />}
      aria-current={active ? "page" : undefined}
      className={cn(navButtonClass, active ? "text-foreground" : "text-muted-foreground")}
      variant="ghost"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function StudioNavRail({
  routeId,
  infoStep,
  onInfoStepChange,
}: {
  routeId: string;
  infoStep: InfoStep;
  onInfoStepChange: (step: InfoStep) => void;
}) {
  return (
    <nav
      aria-label="Primary"
      className="hidden h-full min-h-0 w-60 min-w-60 flex-col items-stretch border-r border-border/80 bg-card/32 p-2.5 md:flex"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto">
        <NavButton active={routeId === "assay"} to="/assay">
          Choose assay
        </NavButton>
        <div className="flex flex-col items-center gap-2">
          <NavButton active={routeId === "info"} to="/info">
            Basic info
          </NavButton>
          {routeId === "info" ? (
            <div className="flex gap-1">
              {[1, 2, 3].map((step) => (
                <Button
                  key={step}
                  aria-pressed={infoStep === step}
                  className="h-7 w-7 justify-center p-0 text-xs"
                  size="sm"
                  type="button"
                  variant={infoStep === step ? "default" : "outline"}
                  onClick={() => onInfoStepChange(step as InfoStep)}
                >
                  {step}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        <NavButton active={routeId === "align"} to="/align">
          Align pattern
        </NavButton>
        <NavButton active={routeId === "inspect"} to="/inspect">
          Inspect ROI
        </NavButton>
        <NavButton active={routeId === "result"} to="/result">
          View results
        </NavButton>
      </div>
    </nav>
  );
}
