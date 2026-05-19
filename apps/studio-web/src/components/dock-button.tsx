import { Button } from "@lisca/ui";
import type { ReactNode } from "react";

export function DockButton(props: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="w-full justify-center"
      disabled={props.disabled}
      size="sm"
      type="button"
      variant={props.active ? "default" : "outline"}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}
