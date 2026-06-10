import type { AnnotationLabel, AnnotationMode } from "@lisca/contracts";
import {
  AnnotationModeToggle,
  AnnotationToolSlider,
  Button,
  labelColorStyle,
  Section,
  useShellTheme,
} from "@lisca/ui-native";
import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";

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
  onModeChange: (mode: AnnotationMode) => void;
  onOverlayOpacityChange: (value: number) => void;
  onBrushSizeChange: (value: number) => void;
  onClassificationChange: (labelId: string | null) => void;
  onPaintLabelChange: (labelId: string) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
}) {
  const { colors } = useShellTheme();
  const activeError =
    props.scanError ?? props.frameError ?? props.annotationError ?? props.saveError;
  const loading = props.scanLoading || props.frameLoading || props.annotationLoading;

  return (
    <ScrollView contentContainerStyle={styles.root} style={styles.scroll}>
      <Section title="Mode">
        <AnnotationModeToggle mode={props.mode} onModeChange={props.onModeChange} />
      </Section>
      <Section contentStyle={styles.labelsContent} title="Labels">
        <View style={styles.labelsGrid}>
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
                disabled={!props.canEdit}
                style={[
                  styles.labelChip,
                  { borderColor: colors.border, opacity: props.canEdit ? 1 : 0.5 },
                  chipStyle,
                ]}
                onPress={() => {
                  if (props.mode === "classification") {
                    props.onClassificationChange(selected ? null : label.id);
                  } else {
                    props.onPaintLabelChange(label.id);
                  }
                }}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.labelText,
                    chipStyle ? { color: chipStyle.color } : { color: colors.foreground },
                  ]}
                >
                  {label.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {props.labels.length === 0 ? (
          <View style={[styles.emptyLabels, { borderColor: colors.border }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: "center" }}>
              No labels loaded.
            </Text>
          </View>
        ) : null}
        {loading ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Loading…</Text>
        ) : null}
        {activeError ? (
          <Text style={{ color: colors.destructive, fontSize: 12 }}>{activeError}</Text>
        ) : null}
      </Section>
      <Section contentStyle={styles.editGrid} title="Edit">
        <View style={styles.gridCell}>
          <Button
            disabled={!props.canUndo}
            label="Undo"
            size="sm"
            variant="outline"
            onPress={props.onUndo}
          />
        </View>
        <View style={styles.gridCell}>
          <Button
            disabled={!props.canRedo}
            label="Redo"
            size="sm"
            variant="outline"
            onPress={props.onRedo}
          />
        </View>
        <View style={styles.gridCell}>
          <Button
            disabled={props.mode !== "segmentation" || !props.canEdit}
            label="Clear"
            size="sm"
            variant="outline"
            onPress={props.onClear}
          />
        </View>
        <View style={styles.gridCell}>
          <Button
            disabled={!props.dirty}
            label="Discard"
            size="sm"
            variant="outline"
            onPress={props.onDiscard}
          />
        </View>
      </Section>
      {props.mode === "segmentation" ? (
        <Section contentStyle={styles.brushContent} title="Brush">
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
        </Section>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  root: {
    gap: 8,
    padding: 12,
  },
  labelsContent: {
    gap: 8,
  },
  labelsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  labelChip: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  emptyLabels: {
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 24,
    width: "100%",
  },
  editGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridCell: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 0,
  },
  brushContent: {
    gap: 12,
  },
});
