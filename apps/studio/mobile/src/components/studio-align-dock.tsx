import {
  AlignGridShapeDockSection,
  AlignToolToolbar,
  Button,
  DockSection,
  DockStrip,
  Text,
  dockLayoutClasses,
} from "@lisca/ui-native";
import { View } from "react-native";

import { useStudioAlignPage } from "../state/studio-align-page-context";
import { instructionForStep } from "../state/studio-routes";

export function StudioAlignDock() {
  const { state, smartExclude, saveAndAdvance } = useStudioAlignPage();
  const gridDisabled = state.cropping || !state.frame;

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <Text className="text-center text-sm leading-5 text-foreground">
          {instructionForStep("alignPattern")}
        </Text>
      </DockSection>
      <AlignGridShapeDockSection
        disabled={gridDisabled}
        shape={state.grid.shape}
        onShapeChange={(shape) =>
          state.setGrid((grid) => ({
            ...grid,
            shape,
          }))
        }
      />
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Tool"
      >
        <AlignToolToolbar
          mode={state.toolMode}
          patternZoomLocked={state.patternZoomLocked}
          shortcutsEnabled={!state.cropping && !state.saving}
          onModeChange={state.setToolMode}
          onPatternZoomLockedChange={state.setPatternZoomLocked}
        />
      </DockSection>
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Action"
      >
        <View className={dockLayoutClasses.stack}>
          <View className={dockLayoutClasses.cols2}>
            <View className={dockLayoutClasses.cell}>
              <Button
                disabled={!state.frame || state.saving || state.cropping}
                size="sm"
                variant="outline"
                onPress={state.resetCurrent}
              >
                <Text className="text-xs">Reset</Text>
              </Button>
            </View>
            <View className={dockLayoutClasses.cell}>
              <Button
                disabled={
                  !state.workspacePath ||
                  state.alignPositions.length === 0 ||
                  state.saving ||
                  state.cropping ||
                  state.findingFirstUnaligned
                }
                size="sm"
                variant="outline"
                onPress={() => void state.goToFirstUnaligned()}
              >
                <Text className="text-xs">Jump</Text>
              </Button>
            </View>
          </View>
          <View className={dockLayoutClasses.cols2}>
            <View className={dockLayoutClasses.cell}>
              <Button
                disabled={!state.canGoBack || state.saving || state.cropping}
                size="sm"
                variant="outline"
                onPress={state.goBack}
              >
                <Text className="text-xs">Back</Text>
              </Button>
            </View>
            <View className={dockLayoutClasses.cell}>
              <Button
                disabled={!state.frame || state.saving || state.cropping || smartExclude.busy}
                size="sm"
                variant="outline"
                onPress={() => void saveAndAdvance()}
              >
                <Text className="text-xs">Next</Text>
              </Button>
            </View>
          </View>
        </View>
      </DockSection>
    </DockStrip>
  );
}
