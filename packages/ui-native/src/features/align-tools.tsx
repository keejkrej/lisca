import type { AlignGridToolMode } from "@lisca/utils";
import { Lock, Unlock } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { DockButton } from "../shell/buttons.tsx";
import { shellOutlineElevation } from "../shell/shell-chrome.ts";
import { Section } from "../shell/section.tsx";
import { useShellTheme } from "../theme/shell-theme.tsx";

export type AlignToolsProps = {
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

export function AlignTools(props: AlignToolsProps) {
  const {
    mode,
    onModeChange,
    patternZoomLocked = false,
    onPatternZoomLockedChange,
    sectionTitle = "Tool",
    sectionDescription,
    sectionStyle,
    sectionContentStyle,
  } = props;

  const toolbar = (
    <View style={styles.toolbar}>
      {alignToolDefinitions.map(({ mode: toolMode, label }) =>
        toolMode === "zoom-pattern" ? (
          <View key={toolMode} style={styles.patternRow}>
            <DockButton
              active={mode === toolMode}
              label={label}
              style={styles.patternButton}
              onPress={() => onModeChange(toolMode)}
            />
            <PatternZoomLockButton
              disabled={!onPatternZoomLockedChange}
              locked={patternZoomLocked}
              onPress={() => onPatternZoomLockedChange?.(!patternZoomLocked)}
            />
          </View>
        ) : (
          <DockButton
            key={toolMode}
            active={mode === toolMode}
            label={label}
            style={styles.toolButton}
            onPress={() => onModeChange(toolMode)}
          />
        ),
      )}
    </View>
  );

  return (
    <Section
      contentStyle={[{ flex: 1, minHeight: 0 }, sectionContentStyle]}
      description={sectionDescription}
      style={[{ flex: 1, minWidth: 0 }, sectionStyle]}
      title={sectionTitle}
    >
      {toolbar}
    </Section>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 0,
  },
  toolButton: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 120,
  },
  patternRow: {
    flexBasis: "48%",
    flexDirection: "row",
    flexGrow: 1,
    gap: 4,
    minWidth: 120,
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
