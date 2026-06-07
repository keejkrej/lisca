import type { AlignGridShape } from "@lisca/contracts";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { Button } from "../shell/buttons.tsx";
import { Panel } from "../shell/panel.tsx";
import { useShellTheme } from "../theme/shell-theme.tsx";
import type { NavigationOption } from "./frame-navigation.tsx";

export function AlignGrid(props: {
  shape: AlignGridShape;
  shapeOptions: NavigationOption<AlignGridShape>[];
  rotationDegrees: number;
  vectorA: number;
  vectorB: number;
  vectorMin: number;
  patternWidth: number;
  patternHeight: number;
  patternMin: number;
  offsetX: number;
  offsetY: number;
  overlayVisible: boolean;
  overlayOpacity: number;
  onShapeChange: (shape: AlignGridShape) => void;
  onRotationDegreesChange: (degrees: number) => void;
  onVectorAChange: (value: number) => void;
  onVectorBChange: (value: number) => void;
  onPatternWidthChange: (value: number) => void;
  onPatternHeightChange: (value: number) => void;
  onOffsetXChange: (value: number) => void;
  onOffsetYChange: (value: number) => void;
  onOverlayVisibleChange: (visible: boolean) => void;
  onOverlayOpacityChange: (opacity: number) => void;
  onReset: () => void;
}) {
  const { colors } = useShellTheme();
  return (
    <Panel title="Align grid">
      <View style={styles.row}>
        <Text style={{ color: colors.foreground }}>Visible</Text>
        <Switch value={props.overlayVisible} onValueChange={props.onOverlayVisibleChange} />
      </View>
      <NumberField label="Rotation°" value={props.rotationDegrees} onChange={props.onRotationDegreesChange} />
      <NumberField label="Spacing A" value={props.vectorA} onChange={props.onVectorAChange} />
      <NumberField label="Spacing B" value={props.vectorB} onChange={props.onVectorBChange} />
      <NumberField label="Cell W" value={props.patternWidth} onChange={props.onPatternWidthChange} />
      <NumberField label="Cell H" value={props.patternHeight} onChange={props.onPatternHeightChange} />
      <NumberField label="Offset X" value={props.offsetX} onChange={props.onOffsetXChange} />
      <NumberField label="Offset Y" value={props.offsetY} onChange={props.onOffsetYChange} />
      <View style={styles.shapeRow}>
        {props.shapeOptions.map((option) => (
          <Button
            key={option.value}
            label={option.label}
            compact
            variant={props.shape === option.value ? "default" : "outline"}
            onPress={() => props.onShapeChange(option.value)}
          />
        ))}
      </View>
      <Button label="Reset grid" variant="outline" compact onPress={props.onReset} />
    </Panel>
  );
}

function NumberField(props: { label: string; value: number; onChange: (value: number) => void }) {
  const { colors } = useShellTheme();
  return (
    <View style={styles.field}>
      <Text style={{ color: colors.mutedForeground, width: 72 }}>{props.label}</Text>
      <TextInput
        value={String(props.value)}
        keyboardType="numeric"
        onChangeText={(text) => {
          const next = Number(text);
          if (Number.isFinite(next)) props.onChange(next);
        }}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  field: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  shapeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});

export function AlignTools(props: {
  mode: string;
  patternZoomLocked: boolean;
  onModeChange: (mode: string) => void;
  onPatternZoomLockedChange: (locked: boolean) => void;
}) {
  const modes = ["pan", "rotate", "zoom", "zoom-vector", "zoom-pattern"] as const;
  return (
    <Panel title="Tools">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {modes.map((mode) => (
          <Button
            key={mode}
            label={mode}
            compact
            variant={props.mode === mode ? "default" : "outline"}
            onPress={() => props.onModeChange(mode)}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text>Pattern zoom lock</Text>
        <Switch value={props.patternZoomLocked} onValueChange={props.onPatternZoomLockedChange} />
      </View>
    </Panel>
  );
}

export function ReadonlyPathField(props: { value: string }) {
  const { colors } = useShellTheme();
  return (
    <View style={[pathStyles.root, { borderColor: colors.border, backgroundColor: colors.muted }]}>
      <Text style={{ color: colors.foreground, fontSize: 12 }} numberOfLines={1}>
        {props.value}
      </Text>
    </View>
  );
}

const pathStyles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flex: 1,
  },
});
