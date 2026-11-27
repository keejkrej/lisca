import type { StudioAnyRouteTo, StudioRouteTo } from "./studio-router";

export type { StudioAnyRouteTo, StudioRouteTo };

export function studioNavigate(navigate: (to: StudioAnyRouteTo) => void, to: StudioRouteTo): void {
  navigate(to);
}
