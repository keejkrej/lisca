import { ViewTransition, type ReactNode } from "react";

export function StudioRouteTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      default="none"
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
    >
      {children}
    </ViewTransition>
  );
}
