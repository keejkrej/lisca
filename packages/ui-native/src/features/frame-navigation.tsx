import { StyleSheet, Text, View } from "react-native";

import { Button } from "../shell/buttons.tsx";
import { Panel } from "../shell/panel.tsx";
import { useShellTheme } from "../theme/shell-theme.tsx";

export type NavigationOption<T extends string | number = number> = {
  label: string;
  value: T;
};

export function toNavigationOptions(values: readonly number[]): NavigationOption[] {
  return values.map((value) => ({ label: String(value), value }));
}

export function findNavigationOptionIndex(options: NavigationOption[], value: number): number {
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : 0;
}

export function stepNavigationValue(
  options: NavigationOption[],
  current: number,
  delta: number,
): number | null {
  const index = findNavigationOptionIndex(options, current);
  const next = index + delta;
  if (next < 0 || next >= options.length) return null;
  return options[next]?.value ?? null;
}

type AxisProps = {
  label: string;
  value: number;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
};

function AxisRow(props: AxisProps) {
  const { colors } = useShellTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{props.label}</Text>
      <Text style={[styles.value, { color: colors.foreground }]}>{props.value}</Text>
      <View style={styles.actions}>
        <Button label="◀" compact variant="outline" disabled={props.previousDisabled || props.disabled} onPress={props.onPrevious} />
        <Button label="▶" compact variant="outline" disabled={props.nextDisabled || props.disabled} onPress={props.onNext} />
      </View>
    </View>
  );
}

export function FrameNavigation(props: {
  position: AxisProps & { options: NavigationOption[]; onChange: (value: number) => void };
  channel: AxisProps & { options: NavigationOption[]; onChange: (value: number) => void };
  timepoint: AxisProps & { min: number; max: number; onCommit: (value: number) => void };
  zPlane: AxisProps & { min: number; max: number; onCommit: (value: number) => void };
}) {
  return (
    <Panel title="Frame">
      <AxisRow {...props.position} />
      <AxisRow {...props.channel} />
      <AxisRow {...props.timepoint} />
      <AxisRow {...props.zPlane} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    width: 72,
    fontSize: 12,
    fontWeight: "600",
  },
  value: {
    flex: 1,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    gap: 4,
  },
});
