import {
  AnnotationModeToggle,
  AnnotationToolSlider,
  Button,
  SidebarSection,
  SidebarStack,
  labelColorStyle,
  Text,
} from "@lisca/ui-native";
import { createEmptyMask } from "@lisca/utils";
import { Pressable, View } from "react-native";

import { useStudioAnnotateLabels } from "../state/studio-annotate-page-selectors";
import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";

export function StudioAnnotateRight() {
  const { state } = useStudioAnnotatePage();
  const labels = useStudioAnnotateLabels();
  const activeError =
    labels.scanError ?? labels.frameError ?? labels.annotationError ?? labels.saveError;
  const loading = labels.scanLoading || labels.frameLoading || labels.annotationLoading;

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
        <AnnotationModeToggle mode={labels.mode} onModeChange={labels.setMode} />
      </SidebarSection>
      <SidebarSection contentClassName="flex-row flex-wrap gap-2" title="Labels">
        {labels.labels.map((label) => {
          const selected =
            labels.mode === "classification"
              ? labels.annotation.current.classificationLabelId === label.id
              : labels.activeLabelId === label.id;
          const chipStyle = labelColorStyle(label, selected);
          return (
            <Pressable
              key={label.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !labels.canEdit }}
              className={
                labels.canEdit
                  ? "min-w-[47%] flex-grow rounded-lg border border-border px-2 py-2.5"
                  : "min-w-[47%] flex-grow rounded-lg border border-border px-2 py-2.5 opacity-50"
              }
              disabled={!labels.canEdit}
              style={chipStyle}
              onPress={() => {
                if (labels.mode === "classification") {
                  labels.annotation.commit({
                    classificationLabelId: selected ? null : label.id,
                    mask: labels.annotation.current.mask,
                  });
                } else {
                  labels.setActiveLabelId(label.id);
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
        {labels.labels.length === 0 ? (
          <Button
            className="w-full"
            disabled={!labels.workspacePath}
            size="sm"
            variant="outline"
            onPress={labels.openLabelDialog}
          >
            <Text className="text-xs">Add</Text>
          </Button>
        ) : (
          <Button
            className="w-full"
            disabled={!labels.workspacePath}
            size="sm"
            variant="outline"
            onPress={labels.openLabelDialog}
          >
            <Text className="text-xs">Edit labels</Text>
          </Button>
        )}
        {loading ? <Text className="w-full text-xs text-muted-foreground">Loading…</Text> : null}
        {activeError ? <Text className="w-full text-xs text-destructive">{activeError}</Text> : null}
      </SidebarSection>
      <SidebarSection contentClassName="flex-row flex-wrap gap-2" title="Edit">
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!labels.annotation.canUndo}
            size="sm"
            variant="outline"
            onPress={labels.annotation.undo}
          >
            <Text className="text-xs">Undo</Text>
          </Button>
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!labels.annotation.canRedo}
            size="sm"
            variant="outline"
            onPress={labels.annotation.redo}
          >
            <Text className="text-xs">Redo</Text>
          </Button>
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={labels.mode !== "segmentation" || !labels.canEdit}
            size="sm"
            variant="outline"
            onPress={() =>
              labels.frame &&
              labels.annotation.commit({
                classificationLabelId: labels.annotation.current.classificationLabelId,
                mask: createEmptyMask(labels.frame.width, labels.frame.height),
              })
            }
          >
            <Text className="text-xs">Clear</Text>
          </Button>
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!labels.annotation.dirty}
            size="sm"
            variant="outline"
            onPress={labels.annotation.discard}
          >
            <Text className="text-xs">Discard</Text>
          </Button>
        </View>
      </SidebarSection>
      {labels.mode === "segmentation" ? (
        <SidebarSection contentClassName="gap-3" title="Brush">
          <AnnotationToolSlider
            label="Opacity"
            max={0.95}
            min={0.05}
            step={0.01}
            value={labels.overlayOpacity}
            valueLabel={`${Math.round(labels.overlayOpacity * 100)}%`}
            onChange={labels.setOverlayOpacity}
          />
          <AnnotationToolSlider
            label="Brush Size"
            max={32}
            min={1}
            step={1}
            value={labels.brushSize}
            valueLabel={String(Math.round(labels.brushSize))}
            onChange={(value) => labels.setBrushSize(Math.round(value))}
          />
        </SidebarSection>
      ) : null}
    </SidebarStack>
  );
}
