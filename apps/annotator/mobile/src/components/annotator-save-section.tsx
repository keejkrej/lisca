import { ActivityIndicator, View } from "react-native";

import {
  Button,
  DockSection,
  dockLayoutClasses,
  dockSectionWidths,
  ReadonlyPathField,
  Text,
} from "@lisca/ui-native";

import { annotationOutputPaths } from "../utils/annotation-output";
import { useAnnotateDock } from "../state/annotate-page-selectors";

export function AnnotatorSaveSection() {
  const dock = useAnnotateDock();
  const paths = annotationOutputPaths(dock.request, dock.mode);

  return (
    <DockSection
      className={dockSectionWidths.save}
      contentClassName={dockLayoutClasses.content}
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
          className={dockLayoutClasses.button}
          disabled={!dock.canSave}
          size="sm"
          variant="outline"
          onPress={() => void dock.handleSave()}
        >
          {dock.saving ? <ActivityIndicator size="small" /> : <Text className="text-xs">Save</Text>}
        </Button>
      </View>
    </DockSection>
  );
}
