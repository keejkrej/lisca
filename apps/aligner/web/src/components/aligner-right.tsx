import { SidebarStack } from "@lisca/ui/shell";

import { AlignGridControls } from "./align-grid-controls";
import { AlignSelectionControls } from "./align-selection-controls";

export function AlignerRight() {
  return (
    <SidebarStack>
      <AlignGridControls />
      <AlignSelectionControls />
    </SidebarStack>
  );
}
