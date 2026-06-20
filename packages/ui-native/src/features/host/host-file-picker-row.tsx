import type { HostFsEntry } from "@lisca/contracts";
import { FileIcon, FolderIcon } from "lucide-react-native";
import { Pressable } from "react-native";

import { Icon } from "../../../components/ui/icon";
import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";

export const FILE_PICKER_ROW_HEIGHT = 40;

export type HostFilePickerRowProps = {
  entry: HostFsEntry;
  muted?: boolean;
  selected?: boolean;
  onPress: (entry: HostFsEntry) => void;
};

export function HostFilePickerRow({
  entry,
  muted = false,
  selected = false,
  onPress,
}: HostFilePickerRowProps) {
  const EntryIcon = entry.isDirectory ? FolderIcon : FileIcon;

  return (
    <Pressable
      accessibilityLabel={entry.name}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        "min-h-10 flex-row items-center gap-2 border-b border-border px-3 py-2",
        selected && "bg-primary/15",
        muted && "opacity-60",
      )}
      onPress={() => onPress(entry)}
    >
      <Icon
        as={EntryIcon}
        className="size-4 shrink-0 text-muted-foreground"
        size={16}
        strokeWidth={2}
      />
      <Text className="min-w-0 flex-1 text-sm text-foreground" numberOfLines={1}>
        {entry.name}
      </Text>
    </Pressable>
  );
}

/** @deprecated Use {@link HostFilePickerRow}. */
export const FilePickerRow = HostFilePickerRow;
/** @deprecated Use {@link HostFilePickerRowProps}. */
export type FilePickerRowProps = HostFilePickerRowProps;
