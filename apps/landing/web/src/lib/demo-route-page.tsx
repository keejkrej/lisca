import type { ComponentType } from "react";

export function DemoRoutePage(props: { Demo: ComponentType }) {
  return (
    <div className="h-dvh">
      <props.Demo />
    </div>
  );
}
