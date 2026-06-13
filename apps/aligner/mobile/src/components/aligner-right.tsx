import { AlignGridRail, SidebarStack } from "@lisca/ui-native";

import type { AlignState } from "../state/use-align-state";
import { AlignSelectionControls } from "./align-selection-controls";

export function AlignerRight(props: { alignState: AlignState }) {
  const { alignState: state } = props;
  const disabled = state.cropping || !state.frame;

  return (
    <SidebarStack>
      <AlignGridRail disabled={disabled} grid={state.grid} onGridChange={state.setGrid} />
      <AlignSelectionControls state={state} />
    </SidebarStack>
  );
}
