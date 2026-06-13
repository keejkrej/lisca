import type { AnnotationLabel } from "@lisca/contracts";
import { normalizeLabelId, useLabelCreationForm } from "@lisca/ui-headless/label-creation-form";
import {
  Button,
  DialogBody,
  DialogDescriptionText,
  DialogErrorText,
  DialogFooter,
  DialogHeader,
  DialogSurface,
  DialogTitleText,
  Field,
  FieldLabel,
  Input,
  ModalScrim,
  Text,
} from "@lisca/ui-native";
import { ActivityIndicator, ScrollView, View } from "react-native";

export function LabelCreationDialog(props: {
  open: boolean;
  workspacePath: string | null;
  labels: AnnotationLabel[];
  saving: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (labels: AnnotationLabel[]) => void;
}) {
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
          <View className="w-full flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <DialogTitleText>Create labels</DialogTitleText>
              <DialogDescriptionText className="mt-0.5" numberOfLines={1}>
                {props.workspacePath ?? "Select a workspace first"}
              </DialogDescriptionText>
            </View>
            <Button size="sm" variant="ghost" onPress={() => props.onOpenChange(false)}>
              <Text className="text-xs">Close</Text>
            </Button>
          </View>
        </DialogHeader>

        <DialogBody className="max-h-[420px]">
          <ScrollView contentContainerClassName="gap-3">
            {form.drafts.map((draft, index) => (
              <View key={draft.id} className="flex-row flex-wrap gap-2">
                <Field className="min-w-[120px] flex-1">
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    accessibilityLabel={`Label ${index + 1} name`}
                    value={draft.name}
                    onChangeText={(name) => {
                      form.updateDraft(index, { name, id: normalizeLabelId(name) || draft.id });
                    }}
                  />
                </Field>
                <Field className="min-w-[120px] flex-1">
                  <FieldLabel>ID</FieldLabel>
                  <Input
                    accessibilityLabel={`Label ${index + 1} id`}
                    autoCapitalize="none"
                    value={draft.id}
                    onChangeText={(id) => form.updateDraft(index, { id })}
                  />
                </Field>
                <Field className="w-24 min-w-[96px]">
                  <FieldLabel>Color</FieldLabel>
                  <Input
                    accessibilityLabel={`Label ${index + 1} color`}
                    autoCapitalize="none"
                    value={draft.color}
                    onChangeText={(color) => form.updateDraft(index, { color })}
                  />
                </Field>
                <View className="justify-end pb-0.5">
                  <Button
                    disabled={form.drafts.length <= 1}
                    size="sm"
                    variant="ghost"
                    onPress={() => form.removeDraft(index)}
                  >
                    <Text className="text-xs">Remove</Text>
                  </Button>
                </View>
              </View>
            ))}
            <Button size="sm" variant="outline" onPress={form.addDraft}>
              <Text className="text-xs">Add label</Text>
            </Button>
            {form.activeError ? <DialogErrorText>{form.activeError}</DialogErrorText> : null}
          </ScrollView>
        </DialogBody>

        <DialogFooter>
          <View className="w-full flex-row justify-end gap-2">
            <Button variant="outline" onPress={() => props.onOpenChange(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button disabled={!props.workspacePath} onPress={submit}>
              {props.saving ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text>Save labels</Text>
              )}
            </Button>
          </View>
        </DialogFooter>
      </DialogSurface>
    </ModalScrim>
  );
}
