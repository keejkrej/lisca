import { StyleSheet, View } from "react-native";

import type { AlignState } from "../state/use-align-state";
import { AlignGridControls } from "./align-grid-controls";
import { AlignSelectionControls } from "./align-selection-controls";

export function AlignerRight(props: { alignState: AlignState }) {
  return (
    <View style={styles.root}>
      <AlignGridControls state={props.alignState} />
      <AlignSelectionControls state={props.alignState} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
});
