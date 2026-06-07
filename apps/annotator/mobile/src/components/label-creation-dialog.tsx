import type { AnnotationLabel } from "@lisca/contracts";
import {
  Button,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSurface,
  Field,
  ModalScrim,
  useShellTheme,
} from "@lisca/ui-native";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

type LabelDraft = {
  id: string;
  name: string;
  color: string;
};

const defaultLabelDrafts: LabelDraft[] = [
  { id: "class-1", name: "Class 1", color: "#22c55e" },
  { id: "class-2", name: "Class 2", color: "#3b82f6" },
  { id: "class-3", name: "Class 3", color: "#f59e0b" },
];

function normalizeLabelId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function labelDraftsFrom(labels: AnnotationLabel[]) {
  return labels.length > 0 ? labels.map((label) => ({ ...label })) : defaultLabelDrafts;
}

export function LabelCreationDialog(props: {
  open: boolean;
  workspacePath: string | null;
  labels: AnnotationLabel[];
  saving: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (labels: AnnotationLabel[]) => void;
}) {
  const { colors } = useShellTheme();
  const [drafts, setDrafts] = useState<LabelDraft[]>(() => labelDraftsFrom(props.labels));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (props.open) {
      setDrafts(labelDraftsFrom(props.labels));
      setLocalError(null);
    }
  }, [props.labels, props.open]);

  const updateDraft = (index: number, patch: Partial<LabelDraft>) => {
    setDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)),
    );
  };

  const addDraft = () => {
    setDrafts((current) => [
      ...current,
      {
        id: `class-${current.length + 1}`,
        name: `Class ${current.length + 1}`,
        color: "#a855f7",
      },
    ]);
  };

  const removeDraft = (index: number) => {
    setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
  };

  const submit = () => {
    const labels = drafts.map((draft) => ({
      id: normalizeLabelId(draft.id || draft.name),
      name: draft.name.trim(),
      color: draft.color.trim(),
    }));
    if (labels.length === 0) {
      setLocalError("Add at least one label.");
      return;
    }
    if (labels.some((label) => !label.id || !label.name || !label.color)) {
      setLocalError("Each label needs an id, name, and color.");
      return;
    }
    if (new Set(labels.map((label) => label.id)).size !== labels.length) {
      setLocalError("Label ids must be unique.");
      return;
    }
    props.onSave(labels);
  };

  const activeError = localError ?? props.error;

  return (
    <ModalScrim open={props.open} onClose={() => props.onOpenChange(false)}>
      <DialogSurface maxWidth={640} padded={false}>
        <DialogHeader>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.foreground }]}>Create labels</Text>
              <Text numberOfLines={1} style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {props.workspacePath ?? "Select a workspace first"}
              </Text>
            </View>
            <Button label="Close" size="sm" variant="ghost" onPress={() => props.onOpenChange(false)} />
          </View>
        </DialogHeader>

        <DialogBody style={styles.body}>
          <ScrollView contentContainerStyle={styles.draftList}>
            {drafts.map((draft, index) => (
              <View key={`${index}:${draft.id}`} style={styles.draftRow}>
                <Field label="Name" style={styles.field}>
                  <TextInput
                    accessibilityLabel={`Label ${index + 1} name`}
                    style={[styles.input, { borderColor: colors.input, color: colors.foreground, backgroundColor: colors.controlSurface }]}
                    value={draft.name}
                    onChangeText={(name) => {
                      updateDraft(index, { name, id: normalizeLabelId(name) || draft.id });
                    }}
                  />
                </Field>
                <Field label="ID" style={styles.field}>
                  <TextInput
                    accessibilityLabel={`Label ${index + 1} id`}
                    autoCapitalize="none"
                    style={[styles.input, { borderColor: colors.input, color: colors.foreground, backgroundColor: colors.controlSurface }]}
                    value={draft.id}
                    onChangeText={(id) => updateDraft(index, { id })}
                  />
                </Field>
                <Field label="Color" style={styles.colorField}>
                  <TextInput
                    accessibilityLabel={`Label ${index + 1} color`}
                    autoCapitalize="none"
                    style={[styles.input, { borderColor: colors.input, color: colors.foreground, backgroundColor: colors.controlSurface }]}
                    value={draft.color}
                    onChangeText={(color) => updateDraft(index, { color })}
                  />
                </Field>
                <View style={styles.removeCell}>
                  <Button
                    disabled={drafts.length <= 1}
                    label="Remove"
                    size="sm"
                    variant="ghost"
                    onPress={() => removeDraft(index)}
                  />
                </View>
              </View>
            ))}
            <Button label="Add label" size="sm" variant="outline" onPress={addDraft} />
            {activeError ? (
              <Text style={{ color: colors.destructive, fontSize: 14 }}>{activeError}</Text>
            ) : null}
          </ScrollView>
        </DialogBody>

        <DialogFooter>
          <View style={styles.footer}>
            <Button label="Cancel" variant="outline" onPress={() => props.onOpenChange(false)} />
            <Button
              disabled={!props.workspacePath}
              label="Save labels"
              loading={props.saving}
              onPress={submit}
            />
          </View>
        </DialogFooter>
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    width: "100%",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  body: {
    maxHeight: 420,
  },
  draftList: {
    gap: 12,
  },
  draftRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  field: {
    flex: 1,
    minWidth: 120,
  },
  colorField: {
    minWidth: 96,
    width: 96,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeCell: {
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    width: "100%",
  },
});
