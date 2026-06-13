import type { HostFsEntry } from "@lisca/contracts";
import { Pressable } from "react-native";

import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";

export const FILE_PICKER_ROW_HEIGHT = 44;

export type FilePickerRowProps = {
  entry: HostFsEntry;
  borderColor: string;
  foregroundColor: string;
  muted?: boolean;
  selected?: boolean;
  onPress: (entry: HostFsEntry) => void;
};

export const FilePickerRow = function FilePickerRow({
  entry,
  borderColor,
  foregroundColor,
  muted = false,
  selected = false,
  onPress,
}: FilePickerRowProps) {
  return (
    <Pressable
      accessibilityLabel={entry.isDirectory ? `Folder ${entry.name}` : `File ${entry.name}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        "min-h-11 border-b px-3 py-2.5",
        selected && "bg-accent/50",
        muted && "opacity-60",
      )}
      style={{ borderColor }}
      onPress={() => onPress(entry)}
    >
      <Text style={{ color: foregroundColor }}>
        {entry.isDirectory ? "Folder" : "File"} {entry.name}
      </Text>
    </Pressable>
  );
};
