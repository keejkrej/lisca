import type { AnnotationMode, RoiFrameRequest } from "@lisca/contracts";
import {
  Button,
  DockToolGrid,
  ReadonlyPathField,
  Section,
  type AnnotationTool,
  type DockToolAction,
  useShellTheme,
} from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import { annotationOutputPaths } from "../utils/annotation-output";

const annotationToolDefinitions: { id: AnnotationTool; label: string }[] = [
  { id: "brush", label: "Brush" },
  { id: "brush-erase", label: "Brush Erase" },
  { id: "lasso", label: "Lasso" },
  { id: "lasso-erase", label: "Lasso Erase" },
];

function buildAnnotationToolActions(
  tool: AnnotationTool,
  onToolChange: (tool: AnnotationTool) => void,
  disabled: boolean,
): DockToolAction[] {
  return annotationToolDefinitions.map(({ id, label }) => ({
    id,
    label,
    disabled,
    active: tool === id,
    onSelect: () => onToolChange(id),
  }));
}

export function AnnotatorDock(props: {
  mode: AnnotationMode;
  tool: AnnotationTool;
  request: RoiFrameRequest | null;
  canSave: boolean;
  saving: boolean;
  shortcutsEnabled?: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onSave: () => void;
}) {
  const { colors } = useShellTheme();
  const paths = annotationOutputPaths(props.request, props.mode);
  const canEditTools = props.mode === "segmentation" && props.shortcutsEnabled !== false;
  const toolActions = buildAnnotationToolActions(props.tool, props.onToolChange, !canEditTools);

  return (
    <View style={styles.root}>
      <Section contentStyle={styles.toolContent} style={styles.section} title="Tool">
        {props.mode === "segmentation" ? (
          <DockToolGrid actions={toolActions} enabled={canEditTools} style={styles.toolGrid} />
        ) : (
          <View style={styles.classificationPlaceholder}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Classification</Text>
          </View>
        )}
      </Section>
      <Section contentStyle={styles.saveContent} style={styles.section} title="Save">
        <View style={[styles.paths, paths.length > 1 ? styles.pathsMulti : null]}>
          {paths.map((path) => (
            <View key={path} style={styles.pathCell}>
              <ReadonlyPathField value={path} />
            </View>
          ))}
        </View>
        <Button
          disabled={!props.canSave}
          label={props.saving ? "Saving" : "Save"}
          loading={props.saving}
          size="sm"
          variant="outline"
          onPress={props.onSave}
        />
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 0,
    padding: 12,
  },
  section: {
    flex: 1,
    minWidth: 0,
  },
  toolContent: {
    flex: 1,
    minHeight: 0,
  },
  toolGrid: {
    flex: 1,
  },
  classificationPlaceholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  saveContent: {
    gap: 8,
  },
  paths: {
    gap: 8,
  },
  pathsMulti: {
    flexDirection: "row",
  },
  pathCell: {
    flex: 1,
    minWidth: 0,
  },
});
