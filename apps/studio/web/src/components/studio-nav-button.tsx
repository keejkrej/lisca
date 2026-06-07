import { Button, cn } from "@lisca/ui";
import type { ReactNode } from "react";

import { useStudioNavigate, type StudioRouteTo } from "../navigation/use-studio-navigate";

const navButtonClass =
  "h-auto w-auto min-w-0 max-w-full shrink-0 rounded-lg px-5 py-2.5 text-xl font-medium";

export function NavButton({
  active,
  children,
  to,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  to: StudioRouteTo;
  onClick?: () => void;
}) {
  const { navigateTo } = useStudioNavigate();

  return (
    <Button
      aria-current={active ? "page" : undefined}
      className={cn(navButtonClass, active ? "text-foreground" : "text-muted-foreground")}
      type="button"
      variant="ghost"
      onClick={() => {
        onClick?.();
        navigateTo(to);
      }}
    >
      {children}
    </Button>
  );
}
