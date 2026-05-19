import { Button } from "@lisca/ui";
import type { ReactNode } from "react";

export function DockButton(props: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="w-full justify-center"
      disabled={props.disabled}
      loading={props.loading}
      size="sm"
      type="button"
      variant={props.active ? "default" : "outline"}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}
