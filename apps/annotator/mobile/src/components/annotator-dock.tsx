import type { RoiFrameRequest } from "@lisca/contracts";
import type { AnnotationMode } from "@lisca/ui-native/features";
import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
  Button,
  DockSection,
  DockStrip,
  ReadonlyPathField,
  dockLayoutClasses,
  dockToolbarMinHeight,
  Text,
  type AnnotationTool,
} from "@lisca/ui-native";
import { View } from "react-native";

import { annotationOutputPaths } from "../utils/annotation-output";

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
  const paths = annotationOutputPaths(props.request, props.mode);
  const canEditTools = props.mode === "segmentation" && props.shortcutsEnabled !== false;
  const toolActions = buildAnnotationToolActions(props.tool, props.onToolChange, !canEditTools);

  return (
    <DockStrip>
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Tool"
      >
        {props.mode === "segmentation" ? (
          <AnnotationToolGrid
            canEditTools={canEditTools}
            shortcutsEnabled={props.shortcutsEnabled}
            toolActions={toolActions}
          />
        ) : (
          <View
            className={dockLayoutClasses.classificationPlaceholder}
            style={{ minHeight: dockToolbarMinHeight(3) }}
          >
            <Text className="text-xs text-muted-foreground">Classification</Text>
          </View>
        )}
      </DockSection>
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Save"
      >
        <View className={dockLayoutClasses.stack}>
          {paths.length > 1 ? (
            <View className={dockLayoutClasses.cols2}>
              {paths.map((path) => (
                <View key={path} className={dockLayoutClasses.cell}>
                  <ReadonlyPathField value={path} />
                </View>
              ))}
            </View>
          ) : (
            paths.map((path) => <ReadonlyPathField key={path} value={path} />)
          )}
          <Button
            disabled={!props.canSave}
            label={props.saving ? "Saving…" : "Save"}
            loading={props.saving}
            size="sm"
            className={dockLayoutClasses.button}
            variant="outline"
            onPress={props.onSave}
          />
        </View>
      </DockSection>
    </DockStrip>
  );
}
