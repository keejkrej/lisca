import { cn } from "@lisca/ui/components";;
import { shellRailChromeClass } from "@lisca/ui/shell";
import { AlignContrastControls } from "./align-contrast-controls";
import { AlignFrameNavigation } from "./align-frame-navigation";

export function AlignerLeft() {
  return (
    <div className={cn("flex min-h-0 flex-col gap-2 p-3", shellRailChromeClass)}>
      <AlignFrameNavigation />
      <AlignContrastControls />
    </div>
  );
}
