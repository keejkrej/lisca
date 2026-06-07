import { buttonVariants, cn } from "@lisca/ui/components";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { studioNavigateWithTransition, type StudioRouteTo } from "../navigation/use-studio-navigate";

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
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname }) ?? "/assay";

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        navButtonClass,
        active ? "text-foreground" : "text-muted-foreground",
      )}
      to={to}
      onClick={(event) => {
        onClick?.();
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        studioNavigateWithTransition(navigate, pathname, to);
      }}
    >
      {children}
    </Link>
  );
}
