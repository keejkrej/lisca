import { SidebarStack } from "@lisca/ui/shell";

import { AlignContrastControls } from "./align-contrast-controls";
import { AlignFrameNavigation } from "./align-frame-navigation";

export function AlignerLeft() {
  return (
    <SidebarStack>
      <AlignFrameNavigation />
      <AlignContrastControls />
    </SidebarStack>
  );
}
