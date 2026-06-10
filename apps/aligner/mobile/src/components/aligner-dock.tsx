import { StyleSheet, View } from "react-native";

import type { AlignState } from "../state/use-align-state";
import { AlignSaveSection } from "./align-save-section";
import { AlignToolSectionPanel } from "./align-tool-section";

export function AlignerDock(props: { alignState: AlignState }) {
  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <AlignToolSectionPanel state={props.alignState} />
      </View>
      <View style={styles.section}>
        <AlignSaveSection state={props.alignState} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
    minHeight: 0,
  },
  section: {
    flex: 1,
    minWidth: 0,
  },
});
