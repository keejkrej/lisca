import { ContrastControl } from "@lisca/ui-native";
import { StyleSheet, View } from "react-native";

import type { AlignState } from "../state/use-align-state";
import { AlignFrameNavigation } from "./align-frame-navigation";

export function AlignerLeft(props: { alignState: AlignState }) {
  return (
    <View style={styles.root}>
      <AlignFrameNavigation state={props.alignState} />
      <ContrastControl
        contrast={props.alignState.contrast}
        disabled={!props.alignState.frame || props.alignState.cropping}
        frame={props.alignState.frame}
        onContrastChange={props.alignState.setContrast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
});
