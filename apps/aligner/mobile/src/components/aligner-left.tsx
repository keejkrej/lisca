import { StyleSheet, View } from "react-native";

import type { AlignState } from "../state/use-align-state";
import { AlignContrastControls } from "./align-contrast-controls";
import { AlignFrameNavigation } from "./align-frame-navigation";

export function AlignerLeft(props: { alignState: AlignState }) {
  return (
    <View style={styles.root}>
      <AlignFrameNavigation state={props.alignState} />
      <AlignContrastControls state={props.alignState} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 8,
    padding: 12,
  },
});
