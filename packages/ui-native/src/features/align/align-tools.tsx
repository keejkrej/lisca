import type { AlignGridToolMode } from "@lisca/utils";
import { alignToolDefinitions } from "@lisca/ui-headless/align-tools";
import {
  ArrowLeftRight,
  Lock,
  Move,
  RotateCw,
  SquareDashedMousePointer,
  Unlock,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DockSection } from "../../shell/regions/dock-section";
import { dockLayoutStyles } from "../../shell/regions/dock-layout";
import {
  shellOutlineButtonStyle,
  shellOutlineElevation,
  shellChromeMetrics,
} from "../../shell/chrome/shell-chrome";
import { useShellTheme } from "../../theme/shell-theme";
import { liscaType } from "../../theme/typography";

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

const alignToolIcons: Partial<Record<AlignGridToolMode, typeof Move>> = {
  pan: Move,
  rotate: RotateCw,
  "zoom-vector": ArrowLeftRight,
  "zoom-pattern": SquareDashedMousePointer,
};

function AlignToolButton(props: {
  mode: AlignGridToolMode;
  active: boolean;
  label: string;
  onPress: () => void;
  style?: object;
}) {
  const { colors, mode: themeMode } = useShellTheme();
  const Icon = alignToolIcons[props.mode] ?? SquareDashedMousePointer;
  const active = props.active;

  return (
    <Pressable
      accessibilityLabel={props.label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={props.onPress}
      style={[
        shellOutlineButtonStyle,
        styles.toolButton,
        !active ? shellOutlineElevation(themeMode) : null,
        {
          backgroundColor: active ? colors.primary : colors.outlineSurface,
          borderColor: colors.input,
        },
        props.style,
      ]}
    >
      <Icon
        color={active ? colors.primaryForeground : colors.foreground}
        size={shellChromeMetrics.iconSize}
        strokeWidth={2}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.toolLabel,
          { color: active ? colors.primaryForeground : colors.foreground },
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

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
      <View key={toolMode} style={dockLayoutStyles.cell}>
        <View style={styles.patternRow}>
          <AlignToolButton
            active={mode === toolMode}
            label={label}
            mode={toolMode}
            style={styles.patternButton}
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
    <View key={toolMode} style={dockLayoutStyles.cell}>
      <AlignToolButton
        active={mode === toolMode}
        label={label}
        mode={toolMode}
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
    <View style={dockLayoutStyles.toolbar}>
      <View style={dockLayoutStyles.cols2}>
        {cells[0]}
        {cells[1]}
      </View>
      <View style={dockLayoutStyles.cols2}>
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
      contentStyle={[dockLayoutStyles.content, sectionContentStyle]}
      description={sectionDescription}
      style={[dockLayoutStyles.section, sectionStyle]}
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
  toolButton: {
    width: "100%",
  },
  toolLabel: {
    ...liscaType.bodySmall,
    flexShrink: 1,
  },
  patternRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "100%",
  },
  patternButton: {
    flex: 1,
    minWidth: 0,
  },
  lockButton: {
    width: shellChromeMetrics.iconButtonSize,
    height: shellChromeMetrics.height,
    minWidth: shellChromeMetrics.iconButtonSize,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: shellChromeMetrics.radius,
  },
});
