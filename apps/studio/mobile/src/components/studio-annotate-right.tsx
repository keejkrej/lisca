import type { AnnotationMode } from "@lisca/ui-native/features";
import {
  AnnotationModeToggle,
  AnnotationToolSlider,
  Button,
  labelColorStyle,
  Section,
  Text,
} from "@lisca/ui-native";
import { Pressable, ScrollView, View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { createEmptyMask } from "../utils/annotation-utils";

export function StudioAnnotateRight({ state }: { state: StudioAnnotateState }) {
  const activeError =
    state.scanError ?? state.frameError ?? state.annotationError ?? state.saveError;
  const loading = state.scanLoading || state.frameLoading || state.annotationLoading;

  if (state.workspaceMissing) {
    return (
      <ScrollView className="-m-3 min-h-0 flex-1" contentContainerClassName="gap-3 p-3">
        <Section title="Annotate">
          <Text className="text-sm text-muted-foreground">Complete Basic info to annotate ROIs.</Text>
        </Section>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="-m-3 min-h-0 flex-1" contentContainerClassName="gap-3 p-3">
      <Section title="Mode">
        <AnnotationModeToggle mode={state.mode} onModeChange={state.setMode} />
      </Section>
      <Section contentClassName="gap-2" title="Labels">
        <View className="flex-row flex-wrap gap-2">
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
        </View>
        {state.labels.length === 0 ? (
          <Button
            label="Add"
            size="sm"
            variant="outline"
            onPress={() => {
              state.setLabelError(null);
              state.setLabelDialogOpen(true);
            }}
          />
        ) : null}
        {loading ? <Text className="text-xs text-muted-foreground">Loading…</Text> : null}
        {activeError ? <Text className="text-xs text-destructive">{activeError}</Text> : null}
      </Section>
      <Section contentClassName="flex-row flex-wrap gap-2" title="Edit">
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!state.annotation.canUndo}
            label="Undo"
            size="sm"
            variant="outline"
            onPress={state.annotation.undo}
          />
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!state.annotation.canRedo}
            label="Redo"
            size="sm"
            variant="outline"
            onPress={state.annotation.redo}
          />
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={state.mode !== "segmentation" || !state.canEdit}
            label="Clear"
            size="sm"
            variant="outline"
            onPress={() =>
              state.frame &&
              state.annotation.commit({
                classificationLabelId: state.annotation.current.classificationLabelId,
                mask: createEmptyMask(state.frame.width, state.frame.height),
              })
            }
          />
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!state.annotation.dirty}
            label="Discard"
            size="sm"
            variant="outline"
            onPress={state.annotation.discard}
          />
        </View>
      </Section>
      {state.mode === "segmentation" ? (
        <Section contentClassName="gap-3" title="Brush">
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
        </Section>
      ) : null}
    </ScrollView>
  );
}
