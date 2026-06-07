import { Button, cn } from "@lisca/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

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
