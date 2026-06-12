import type { AnnotationMode } from "@lisca/ui-native/features";
import {
  AnnotationModeToggle,
  AnnotationToolSlider,
  Button,
  labelColorStyle,
  Section,
  useShellTheme,
} from "@lisca/ui-native";
import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { createEmptyMask } from "../utils/annotation-utils";

export function StudioAnnotateRight({ state }: { state: StudioAnnotateState }) {
  const { colors } = useShellTheme();
  const activeError =
    state.scanError ?? state.frameError ?? state.annotationError ?? state.saveError;
  const loading = state.scanLoading || state.frameLoading || state.annotationLoading;

  if (state.workspaceMissing) {
    return (
      <ScrollView contentContainerStyle={styles.root} style={styles.scroll}>
        <Section title="Annotate">
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            Complete Basic info to annotate ROIs.
          </Text>
        </Section>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.root} style={styles.scroll}>
      <Section title="Mode">
        <AnnotationModeToggle mode={state.mode} onModeChange={state.setMode} />
      </Section>
      <Section contentStyle={styles.labelsContent} title="Labels">
        <View style={styles.labelsGrid}>
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
                disabled={!state.canEdit}
                style={[
                  styles.labelChip,
                  { borderColor: colors.border, opacity: state.canEdit ? 1 : 0.5 },
                  chipStyle,
                ]}
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
            disabled={!state.annotation.canUndo}
            label="Undo"
            size="sm"
            variant="outline"
            onPress={state.annotation.undo}
          />
        </View>
        <View style={styles.gridCell}>
          <Button
            disabled={!state.annotation.canRedo}
            label="Redo"
            size="sm"
            variant="outline"
            onPress={state.annotation.redo}
          />
        </View>
        <View style={styles.gridCell}>
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
        <View style={styles.gridCell}>
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
        <Section contentStyle={styles.brushContent} title="Brush">
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

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    margin: -12,
    minHeight: 0,
  },
  root: {
    gap: 12,
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
    borderRadius: 8,
    borderWidth: 1,
    minWidth: "47%",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
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
