import { StyleSheet, View } from "react-native";

import type { AlignState } from "../state/use-align-state";
import { AlignSaveSection } from "./align-save-section";
import { AlignToolSection } from "./align-tool-section";

export function AlignerDock(props: { alignState: AlignState }) {
  return (
    <View style={styles.root}>
      <AlignToolSection state={props.alignState} />
      <AlignSaveSection state={props.alignState} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
});
