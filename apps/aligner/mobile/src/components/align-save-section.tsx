import { ActivityIndicator, View } from "react-native";

import { Text } from "@lisca/ui-native";
import { Button, DockSection, dockSectionWidths, ReadonlyPathField } from "@lisca/ui-native/shell";

import { useAlignCrop, useAlignNav } from "../state/align-page-selectors";

export function AlignSaveSection() {
  const nav = useAlignNav();
  const crop = useAlignCrop();
  const pos = nav.selection.pos;
  const canSave = Boolean(nav.workspacePath && nav.frame && !crop.cropping);
  const canCrop = Boolean(nav.workspacePath && nav.source && nav.frame && !crop.cropping);

  return (
    <DockSection className={dockSectionWidths.save} title="Save">
      <View className="w-full flex-col gap-2">
        <View className="w-full flex-row gap-2">
          <View className="min-w-0 flex-1">
            <ReadonlyPathField
              accessibilityLabel={`Output path bbox/Pos${pos}.csv`}
              value={`bbox/Pos${pos}.csv`}
            />
          </View>
          <View className="min-w-0 flex-1">
            <ReadonlyPathField
              accessibilityLabel={`Output path align/Pos${pos}.json`}
              value={`align/Pos${pos}.json`}
            />
          </View>
          <View className="min-w-0 flex-1">
            <ReadonlyPathField
              accessibilityLabel={`Output path roi/Pos${pos}`}
              className="text-center"
              value={`roi/Pos${pos}`}
            />
          </View>
        </View>
        <View className="w-full flex-row gap-2">
          <View className="min-w-0 flex-1">
            <Button
              className="h-8 w-full justify-center"
              disabled={!canSave || nav.saving}
              size="sm"
              variant="outline"
              onPress={() => void nav.saveCurrent()}
            >
              {nav.saving ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text>Save</Text>
              )}
            </Button>
          </View>
          <View className="min-w-0 flex-1">
            <Button
              className="w-full justify-center"
              disabled={!canCrop}
              size="sm"
              variant="outline"
              onPress={() => void nav.cropCurrent()}
            >
              <Text>Crop</Text>
            </Button>
          </View>
          <View className="min-w-0 flex-1">
            <Button
              className="w-full justify-center"
              disabled={!nav.workspacePath || !nav.source || crop.cropping}
              size="sm"
              variant="outline"
              onPress={() => void nav.cropBatch()}
            >
              <Text>Batch</Text>
            </Button>
          </View>
        </View>
      </View>
    </DockSection>
  );
}
