import { AlignContrastControls } from "./align-contrast-controls";
import { AlignFrameNavigation } from "./align-frame-navigation";

export function AlignerLeft() {
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <AlignFrameNavigation />
      <AlignContrastControls />
    </div>
  );
}
