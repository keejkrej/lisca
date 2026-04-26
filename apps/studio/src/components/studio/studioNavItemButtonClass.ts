import { cn } from "lisca/shared/ui";

export type StudioNavItemButtonDensity = "default" | "compact";

/** Shared pill style for Studio nav rail and align tool toggles. */
export function studioNavItemButtonClass(
  isActive: boolean,
  density: StudioNavItemButtonDensity = "default",
) {
  return cn(
    "h-auto w-auto min-w-0 max-w-full shrink-0 rounded-2xl text-2xl font-medium",
    density === "compact" ? "px-2 py-2" : "px-5 py-2.5",
    isActive ? "text-foreground" : "text-muted-foreground",
  );
}
