import type { AnnotationMode } from "@lisca/ui-native/features";
import {
  AnnotationModeToggle,
  AnnotationToolSlider,
  Button,
  SidebarSection,
  SidebarStack,
  labelColorStyle,
  Text,
} from "@lisca/ui-native";
import { Pressable, View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { createEmptyMask } from "../utils/annotation-utils";

export function StudioAnnotateRight({ state }: { state: StudioAnnotateState }) {
  const activeError =
    state.scanError ?? state.frameError ?? state.annotationError ?? state.saveError;
  const loading = state.scanLoading || state.frameLoading || state.annotationLoading;

  if (state.workspaceMissing) {
    return (
      <SidebarStack>
        <SidebarSection title="Annotate">
          <Text className="text-sm text-muted-foreground">Complete Basic info to annotate ROIs.</Text>
        </SidebarSection>
      </SidebarStack>
    );
  }

  return (
    <SidebarStack>
      <SidebarSection title="Mode">
        <AnnotationModeToggle mode={state.mode} onModeChange={state.setMode} />
      </SidebarSection>
      <SidebarSection contentClassName="flex-row flex-wrap gap-2" title="Labels">
        {state.labels.map((label) => {
          const selected =
            state.mode === "classification"
              ? state.annotation.current.classificationLabelId === label.id
              : state.activeLabelId === label.id;
          const chipStyle = labelColorStyle(label, selected);
          return (
            <Pressable
              key={label.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !state.canEdit }}
              className={
                state.canEdit
                  ? "min-w-[47%] flex-grow rounded-lg border border-border px-2 py-2.5"
                  : "min-w-[47%] flex-grow rounded-lg border border-border px-2 py-2.5 opacity-50"
              }
              disabled={!state.canEdit}
              style={chipStyle}
              onPress={() => {
                if (state.mode === "classification") {
                  state.annotation.commit({
                    classificationLabelId: selected ? null : label.id,
                    mask: state.annotation.current.mask,
                  });
                } else {
                  state.setActiveLabelId(label.id);
                }
              }}
            >
              <Text
                className="text-center text-xs font-medium"
                numberOfLines={1}
                style={chipStyle ? { color: chipStyle.color } : undefined}
              >
                {label.name}
              </Text>
            </Pressable>
          );
        })}
        {state.labels.length === 0 ? (
          <Button
            className="w-full"
            disabled={!state.workspacePath}
            size="sm"
            variant="outline"
            onPress={() => {
              state.setLabelError(null);
              state.setLabelDialogOpen(true);
            }}
          >
            <Text className="text-xs">Add</Text>
          </Button>
        ) : null}
        {loading ? <Text className="w-full text-xs text-muted-foreground">Loading…</Text> : null}
        {activeError ? <Text className="w-full text-xs text-destructive">{activeError}</Text> : null}
      </SidebarSection>
      <SidebarSection contentClassName="flex-row flex-wrap gap-2" title="Edit">
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!state.annotation.canUndo}
            size="sm"
            variant="outline"
            onPress={state.annotation.undo}
          >
            <Text className="text-xs">Undo</Text>
          </Button>
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!state.annotation.canRedo}
            size="sm"
            variant="outline"
            onPress={state.annotation.redo}
          >
            <Text className="text-xs">Redo</Text>
          </Button>
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={state.mode !== "segmentation" || !state.canEdit}
            size="sm"
            variant="outline"
            onPress={() =>
              state.frame &&
              state.annotation.commit({
                classificationLabelId: state.annotation.current.classificationLabelId,
                mask: createEmptyMask(state.frame.width, state.frame.height),
              })
            }
          >
            <Text className="text-xs">Clear</Text>
          </Button>
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!state.annotation.dirty}
            size="sm"
            variant="outline"
            onPress={state.annotation.discard}
          >
            <Text className="text-xs">Discard</Text>
          </Button>
        </View>
      </SidebarSection>
      {state.mode === "segmentation" ? (
        <SidebarSection contentClassName="gap-3" title="Brush">
          <AnnotationToolSlider
            label="Opacity"
            max={0.95}
            min={0.05}
            step={0.01}
            value={state.overlayOpacity}
            valueLabel={`${Math.round(state.overlayOpacity * 100)}%`}
            onChange={state.setOverlayOpacity}
          />
          <AnnotationToolSlider
            label="Brush Size"
            max={32}
            min={1}
            step={1}
            value={state.brushSize}
            valueLabel={String(Math.round(state.brushSize))}
            onChange={(value) => state.setBrushSize(Math.round(value))}
          />
        </SidebarSection>
      ) : null}
    </SidebarStack>
  );
}
