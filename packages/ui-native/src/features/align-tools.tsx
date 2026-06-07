import type { AlignGridToolMode } from "@lisca/utils";
import { StyleSheet, Switch, Text, View } from "react-native";

import { Button, DockButton } from "../shell/buttons.tsx";
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
            <Button
              compact
              disabled={!onPatternZoomLockedChange}
              label={patternZoomLocked ? "🔒" : "🔓"}
              size="sm"
              style={styles.lockButton}
              variant={patternZoomLocked ? "default" : "outline"}
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
    paddingHorizontal: 0,
  },
});
