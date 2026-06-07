import { StyleSheet, Text, View } from "react-native";

import { Button } from "../shell/buttons.tsx";
import { Panel } from "../shell/panel.tsx";
import { useShellTheme } from "../theme/shell-theme.tsx";

export function ContrastControl(props: {
  minValue: number;
  maxValue: number;
  domainMin: number;
  domainMax: number;
  disabled?: boolean;
  onMinCommit: (value: number) => void;
  onMaxCommit: (value: number) => void;
  onAutoRange: () => void;
}) {
  const { colors } = useShellTheme();
  const step = Math.max(1, Math.round((props.domainMax - props.domainMin) / 100));

  return (
    <Panel title="Contrast">
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
        Min {Math.round(props.minValue)} / Max {Math.round(props.maxValue)}
      </Text>
      <View style={styles.row}>
        <Text style={{ color: colors.foreground, width: 36 }}>Min</Text>
        <Button label="-" compact variant="outline" disabled={props.disabled} onPress={() => props.onMinCommit(Math.max(props.domainMin, props.minValue - step))} />
        <Button label="+" compact variant="outline" disabled={props.disabled} onPress={() => props.onMinCommit(Math.min(props.maxValue, props.minValue + step))} />
      </View>
      <View style={styles.row}>
        <Text style={{ color: colors.foreground, width: 36 }}>Max</Text>
        <Button label="-" compact variant="outline" disabled={props.disabled} onPress={() => props.onMaxCommit(Math.max(props.minValue, props.maxValue - step))} />
        <Button label="+" compact variant="outline" disabled={props.disabled} onPress={() => props.onMaxCommit(Math.min(props.domainMax, props.maxValue + step))} />
      </View>
      <Button label="Auto range" variant="outline" compact disabled={props.disabled} onPress={props.onAutoRange} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
