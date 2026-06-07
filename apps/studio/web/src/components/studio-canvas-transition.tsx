import { ViewTransition, type ReactNode } from "react";

export function StudioCanvasTransition({
  children,
  transitionName,
}: {
  children: ReactNode;
  transitionName: string | null;
}) {
  if (!transitionName) {
    return children;
  }

  return (
    <ViewTransition default="none" name={transitionName} share="morph">
      {children}
    </ViewTransition>
  );
}
