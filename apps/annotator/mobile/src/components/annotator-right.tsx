import type { AnnotationLabel } from "@lisca/contracts";
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

import type { AnnotationValue } from "../utils/annotation-utils";

export function AnnotatorRight(props: {
  labels: AnnotationLabel[];
  mode: AnnotationMode;
  overlayOpacity: number;
  brushSize: number;
  activeLabelId: string | null;
  annotation: AnnotationValue;
  canEdit: boolean;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  scanLoading: boolean;
  frameLoading: boolean;
  annotationLoading: boolean;
  scanError: string | null;
  frameError: string | null;
  annotationError: string | null;
  saveError: string | null;
  workspacePath: string | null;
  onModeChange: (mode: AnnotationMode) => void;
  onOverlayOpacityChange: (value: number) => void;
  onBrushSizeChange: (value: number) => void;
  onClassificationChange: (labelId: string | null) => void;
  onPaintLabelChange: (labelId: string) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
  onOpenLabelDialog: () => void;
}) {
  const activeError =
    props.scanError ?? props.frameError ?? props.annotationError ?? props.saveError;
  const loading = props.scanLoading || props.frameLoading || props.annotationLoading;

  return (
    <SidebarStack>
      <SidebarSection title="Mode">
        <AnnotationModeToggle mode={props.mode} onModeChange={props.onModeChange} />
      </SidebarSection>
      <SidebarSection contentClassName="flex-row flex-wrap gap-2" title="Labels">
        {props.labels.map((label) => {
          const selected =
            props.mode === "classification"
              ? props.annotation.classificationLabelId === label.id
              : props.activeLabelId === label.id;
          const chipStyle = labelColorStyle(label, selected);
          return (
            <Pressable
              key={label.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !props.canEdit }}
              className={
                props.canEdit
                  ? "min-w-0 flex-grow basis-[47%] items-center justify-center rounded-lg border border-border px-2 py-2"
                  : "min-w-0 flex-grow basis-[47%] items-center justify-center rounded-lg border border-border px-2 py-2 opacity-50"
              }
              disabled={!props.canEdit}
              style={chipStyle}
              onPress={() => {
                if (props.mode === "classification") {
                  props.onClassificationChange(selected ? null : label.id);
                } else {
                  props.onPaintLabelChange(label.id);
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
        {props.labels.length === 0 ? (
          <Button
            className="w-full"
            disabled={!props.workspacePath}
            label="Add"
            size="sm"
            variant="outline"
            onPress={props.onOpenLabelDialog}
          />
        ) : null}
        {loading ? <Text className="w-full text-xs text-muted-foreground">Loading…</Text> : null}
        {activeError ? <Text className="w-full text-xs text-destructive">{activeError}</Text> : null}
      </SidebarSection>
      <SidebarSection contentClassName="flex-row flex-wrap gap-2" title="Edit">
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!props.canUndo}
            label="Undo"
            size="sm"
            variant="outline"
            onPress={props.onUndo}
          />
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!props.canRedo}
            label="Redo"
            size="sm"
            variant="outline"
            onPress={props.onRedo}
          />
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={props.mode !== "segmentation" || !props.canEdit}
            label="Clear"
            size="sm"
            variant="outline"
            onPress={props.onClear}
          />
        </View>
        <View className="min-w-0 flex-grow basis-[47%]">
          <Button
            disabled={!props.dirty}
            label="Discard"
            size="sm"
            variant="outline"
            onPress={props.onDiscard}
          />
        </View>
      </SidebarSection>
      {props.mode === "segmentation" ? (
        <SidebarSection contentClassName="gap-3" title="Brush">
          <AnnotationToolSlider
            label="Opacity"
            max={0.95}
            min={0.05}
            step={0.01}
            value={props.overlayOpacity}
            valueLabel={`${Math.round(props.overlayOpacity * 100)}%`}
            onChange={props.onOverlayOpacityChange}
          />
          <AnnotationToolSlider
            label="Brush Size"
            max={32}
            min={1}
            step={1}
            value={props.brushSize}
            valueLabel={String(Math.round(props.brushSize))}
            onChange={(value) => props.onBrushSizeChange(Math.round(value))}
          />
        </SidebarSection>
      ) : null}
    </SidebarStack>
  );
}
