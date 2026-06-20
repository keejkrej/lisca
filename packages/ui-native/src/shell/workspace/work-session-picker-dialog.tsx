import {
  formatWorkSessionWhen,
  useWorkSessionPickerState,
  workSessionPickerDescription,
  type WorkSessionPickerItem,
} from "@lisca/ui-headless/work-session-picker";
import type { LiscaAppId } from "@lisca/utils";
import { Pressable, ScrollView, View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";
import { DialogDescriptionText, DialogStack, DialogTitleText } from "../modal/dialog-copy";
import { DialogSurface, ModalScrim } from "../modal/modal";

export type WorkSessionPickerDialogProps = {
  appId: LiscaAppId;
  open: boolean;
  sessions: WorkSessionPickerItem[];
  onRestore: (sessionId: string) => void;
  onStartNew: () => void;
};

export function WorkSessionPickerDialog({
  appId,
  open,
  sessions,
  onRestore,
  onStartNew,
}: WorkSessionPickerDialogProps) {
  const state = useWorkSessionPickerState(open, sessions);
  if (!state.open) return null;

  return (
    <ModalScrim open={state.open} onClose={() => undefined}>
      <DialogSurface accessibilityLabel="Resume a recent session" maxWidth={448}>
        <DialogStack className="gap-4 p-5">
          <View className="gap-1">
            <DialogTitleText>Resume a session</DialogTitleText>
            <DialogDescriptionText>{workSessionPickerDescription(appId)}</DialogDescriptionText>
          </View>
          <ScrollView className="max-h-72" keyboardShouldPersistTaps="handled">
            <View className="gap-2">
              {state.items.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  className="rounded-md border border-border px-3 py-2 active:bg-muted"
                  onPress={() => onRestore(item.id)}
                >
                  <Text className="font-medium text-foreground text-sm">{item.label}</Text>
                  <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                    {item.path}
                  </Text>
                  <Text className="text-muted-foreground text-xs">
                    {formatWorkSessionWhen(item.lastOpenedAt)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Button className="w-full" size="sm" variant="outline" onPress={onStartNew}>
            <Text>Start new session</Text>
          </Button>
        </DialogStack>
      </DialogSurface>
    </ModalScrim>
  );
}
