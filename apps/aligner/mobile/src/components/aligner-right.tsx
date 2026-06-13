import { View } from "react-native";

import type { AlignState } from "../state/use-align-state";
import { AlignGridControls } from "./align-grid-controls";
import { AlignSelectionControls } from "./align-selection-controls";

export function AlignerRight(props: { alignState: AlignState }) {
  return (
    <View className="gap-2">
      <AlignGridControls state={props.alignState} />
      <AlignSelectionControls state={props.alignState} />
    </View>
  );
}
