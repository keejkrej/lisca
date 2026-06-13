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
  Input,
  ModalScrim,
} from "@lisca/ui-native";
import { ScrollView, View } from "react-native";

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
            <Button
              label="Close"
              size="sm"
              variant="ghost"
              onPress={() => props.onOpenChange(false)}
            />
          </View>
        </DialogHeader>

        <DialogBody className="max-h-[420px]">
          <ScrollView contentContainerClassName="gap-3">
            {form.drafts.map((draft, index) => (
              <View key={draft.id} className="flex-row flex-wrap gap-2">
                <Field className="min-w-[120px] flex-1" label="Name">
                  <Input
                    accessibilityLabel={`Label ${index + 1} name`}
                    value={draft.name}
                    onChangeText={(name) => {
                      form.updateDraft(index, { name, id: normalizeLabelId(name) || draft.id });
                    }}
                  />
                </Field>
                <Field className="min-w-[120px] flex-1" label="ID">
                  <Input
                    accessibilityLabel={`Label ${index + 1} id`}
                    autoCapitalize="none"
                    value={draft.id}
                    onChangeText={(id) => form.updateDraft(index, { id })}
                  />
                </Field>
                <Field className="w-24 min-w-[96px]" label="Color">
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
                    label="Remove"
                    size="sm"
                    variant="ghost"
                    onPress={() => form.removeDraft(index)}
                  />
                </View>
              </View>
            ))}
            <Button label="Add label" size="sm" variant="outline" onPress={form.addDraft} />
            {form.activeError ? <DialogErrorText>{form.activeError}</DialogErrorText> : null}
          </ScrollView>
        </DialogBody>

        <DialogFooter>
          <View className="w-full flex-row justify-end gap-2">
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
