import type { AlignGridToolMode } from "@lisca/utils";
import { Lock, Unlock } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { Button } from "../../shell/chrome/buttons.tsx";
import { DockSection } from "../../shell/regions/dock-section.tsx";
import { shellOutlineElevation } from "../../shell/chrome/shell-chrome.ts";
import { useShellTheme } from "../../theme/shell-theme.tsx";

export type AlignToolSectionProps = {
  mode: AlignGridToolMode;
  onModeChange: (mode: AlignGridToolMode) => void;
  patternZoomLocked?: boolean;
  onPatternZoomLockedChange?: (locked: boolean) => void;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionStyle?: object;
  sectionContentStyle?: object;
};

const alignToolDefinitions: { mode: AlignGridToolMode; label: string }[] = [
  { mode: "pan", label: "Pan" },
  { mode: "rotate", label: "Rotate" },
  { mode: "zoom-vector", label: "Zoom vector" },
  { mode: "zoom-pattern", label: "Zoom pattern" },
];

function PatternZoomLockButton(props: {
  locked: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors, mode } = useShellTheme();
  const Icon = props.locked ? Lock : Unlock;
  const active = props.locked;

  return (
    <Pressable
      accessibilityLabel={props.locked ? "Unlock pattern zoom" : "Lock pattern zoom"}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        styles.lockButton,
        !active ? shellOutlineElevation(mode) : null,
        {
          backgroundColor: active ? colors.primary : colors.outlineSurface,
          borderColor: colors.input,
          opacity: props.disabled ? 0.64 : 1,
        },
      ]}
    >
      <Icon
        color={active ? colors.primaryForeground : colors.foreground}
        size={16}
        strokeWidth={2}
      />
    </Pressable>
  );
}

function renderAlignToolCell(
  toolMode: AlignGridToolMode,
  label: string,
  mode: AlignGridToolMode,
  onModeChange: (mode: AlignGridToolMode) => void,
  patternZoomLocked: boolean,
  onPatternZoomLockedChange?: (locked: boolean) => void,
) {
  if (toolMode === "zoom-pattern") {
    return (
      <View key={toolMode} style={styles.gridCell}>
        <View style={styles.patternRow}>
          <Button
            label={label}
            size="sm"
            style={styles.patternButton}
            variant={mode === toolMode ? "default" : "outline"}
            onPress={() => onModeChange(toolMode)}
          />
          <PatternZoomLockButton
            disabled={!onPatternZoomLockedChange}
            locked={patternZoomLocked}
            onPress={() => onPatternZoomLockedChange?.(!patternZoomLocked)}
          />
        </View>
      </View>
    );
  }

  return (
    <View key={toolMode} style={styles.gridCell}>
      <Button
        label={label}
        size="sm"
        style={styles.toolButton}
        variant={mode === toolMode ? "default" : "outline"}
        onPress={() => onModeChange(toolMode)}
      />
    </View>
  );
}

export type AlignToolToolbarProps = Pick<
  AlignToolSectionProps,
  "mode" | "onModeChange" | "patternZoomLocked" | "onPatternZoomLockedChange"
>;

export function AlignToolToolbar({
  mode,
  onModeChange,
  patternZoomLocked = false,
  onPatternZoomLockedChange,
}: AlignToolToolbarProps) {
  const cells = alignToolDefinitions.map(({ mode: toolMode, label }) =>
    renderAlignToolCell(
      toolMode,
      label,
      mode,
      onModeChange,
      patternZoomLocked,
      onPatternZoomLockedChange,
    ),
  );

  return (
    <View style={styles.toolbar}>
      <View style={styles.row}>
        {cells[0]}
        {cells[1]}
      </View>
      <View style={styles.row}>
        {cells[2]}
        {cells[3]}
      </View>
    </View>
  );
}

export function AlignToolSection({
  mode,
  onModeChange,
  patternZoomLocked = false,
  onPatternZoomLockedChange,
  sectionTitle = "Tool",
  sectionDescription,
  sectionStyle,
  sectionContentStyle,
}: AlignToolSectionProps) {
  return (
    <DockSection
      contentStyle={sectionContentStyle}
      description={sectionDescription}
      style={sectionStyle}
      title={sectionTitle}
    >
      <AlignToolToolbar
        mode={mode}
        patternZoomLocked={patternZoomLocked}
        onModeChange={onModeChange}
        onPatternZoomLockedChange={onPatternZoomLockedChange}
      />
    </DockSection>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    gap: 8,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  toolButton: {
    width: "100%",
  },
  patternRow: {
    flexDirection: "row",
    gap: 4,
    width: "100%",
  },
  patternButton: {
    flex: 1,
    minWidth: 0,
  },
  lockButton: {
    width: 40,
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
  },
});
