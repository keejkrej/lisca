import type { AnnotationLabel } from "@lisca/contracts";
import { normalizeLabelId, useLabelCreationForm } from "@lisca/ui-headless/label-creation-form";
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
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

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
  const form = useLabelCreationForm({
    open: props.open,
    labels: props.labels,
    error: props.error,
  });

  const submit = () => {
    const labels = form.submit();
    if (labels) props.onSave(labels);
  };

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
            <Button
              label="Close"
              size="sm"
              variant="ghost"
              onPress={() => props.onOpenChange(false)}
            />
          </View>
        </DialogHeader>

        <DialogBody style={styles.body}>
          <ScrollView contentContainerStyle={styles.draftList}>
            {form.drafts.map((draft, index) => (
              <View key={draft.id} style={styles.draftRow}>
                <Field label="Name" style={styles.field}>
                  <TextInput
                    accessibilityLabel={`Label ${index + 1} name`}
                    style={[
                      styles.input,
                      {
                        borderColor: colors.input,
                        color: colors.foreground,
                        backgroundColor: colors.controlSurface,
                      },
                    ]}
                    value={draft.name}
                    onChangeText={(name) => {
                      form.updateDraft(index, { name, id: normalizeLabelId(name) || draft.id });
                    }}
                  />
                </Field>
                <Field label="ID" style={styles.field}>
                  <TextInput
                    accessibilityLabel={`Label ${index + 1} id`}
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        borderColor: colors.input,
                        color: colors.foreground,
                        backgroundColor: colors.controlSurface,
                      },
                    ]}
                    value={draft.id}
                    onChangeText={(id) => form.updateDraft(index, { id })}
                  />
                </Field>
                <Field label="Color" style={styles.colorField}>
                  <TextInput
                    accessibilityLabel={`Label ${index + 1} color`}
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        borderColor: colors.input,
                        color: colors.foreground,
                        backgroundColor: colors.controlSurface,
                      },
                    ]}
                    value={draft.color}
                    onChangeText={(color) => form.updateDraft(index, { color })}
                  />
                </Field>
                <View style={styles.removeCell}>
                  <Button
                    disabled={form.drafts.length <= 1}
                    label="Remove"
                    size="sm"
                    variant="ghost"
                    onPress={() => form.removeDraft(index)}
                  />
                </View>
              </View>
            ))}
            <Button label="Add label" size="sm" variant="outline" onPress={form.addDraft} />
            {form.activeError ? (
              <Text style={{ color: colors.destructive, fontSize: 14 }}>{form.activeError}</Text>
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
