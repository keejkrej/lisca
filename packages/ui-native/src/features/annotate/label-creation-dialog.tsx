import type { AnnotationLabel } from "@lisca/contracts";
import { normalizeLabelId, useLabelCreationForm } from "@lisca/ui-headless/label-creation-form";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Field, FieldLabel } from "../../../components/ui/field";
import { Input } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import {
  DialogDescriptionText,
  DialogErrorText,
  DialogTitleText,
} from "../../shell/modal/dialog-copy";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSurface,
  ModalScrim,
} from "../../shell/modal/modal";

export type LabelCreationDialogProps = {
  open: boolean;
  labels: AnnotationLabel[];
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (labels: AnnotationLabel[]) => void;
  title?: string;
  subtitle?: string;
  workspacePath?: string | null;
  saving?: boolean;
  saveLabel?: string;
};

export function LabelCreationDialog({
  open,
  labels,
  error,
  onOpenChange,
  onSave,
  title = "Create labels",
  subtitle,
  workspacePath = null,
  saving = false,
  saveLabel = "Save labels",
}: LabelCreationDialogProps) {
  const form = useLabelCreationForm({ open, labels, error });

  const resolvedSubtitle =
    subtitle ?? (workspacePath != null ? workspacePath : "Select a workspace first");

  const submit = () => {
    const nextLabels = form.submit();
    if (nextLabels) onSave(nextLabels);
  };

  return (
    <ModalScrim open={open} onClose={() => onOpenChange(false)}>
      <DialogSurface maxWidth={640} padded={false}>
        <DialogHeader>
          <View className="w-full flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <DialogTitleText>{title}</DialogTitleText>
              <DialogDescriptionText className="mt-0.5" numberOfLines={1}>
                {resolvedSubtitle}
              </DialogDescriptionText>
            </View>
            <Button size="sm" variant="ghost" onPress={() => onOpenChange(false)}>
              <Text className="text-xs">Close</Text>
            </Button>
          </View>
        </DialogHeader>

        <DialogBody className="max-h-[420px]">
          <ScrollView contentContainerClassName="gap-3">
            {form.drafts.map((draft, index) => (
              <View key={draft.draftKey} className="flex-row flex-wrap gap-2">
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
            <Button variant="outline" onPress={() => onOpenChange(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button disabled={workspacePath != null ? !workspacePath : false} onPress={submit}>
              {saving ? <ActivityIndicator size="small" /> : <Text>{saveLabel}</Text>}
            </Button>
          </View>
        </DialogFooter>
      </DialogSurface>
    </ModalScrim>
  );
}
