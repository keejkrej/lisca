import type { AlignerSource } from "@lisca/contracts";
import { View } from "react-native";

import { Text } from "../../../components/ui/text";
import { Button } from "../../shell/chrome/buttons";
import {
  DialogActions,
  DialogDescriptionText,
  DialogTitleText,
} from "../../shell/modal/dialog-copy";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";

export type SourcePickerRecentItem = {
  source: AlignerSource;
  label?: string;
};

export type SourcePickerModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenFolder: () => void | Promise<void>;
  onOpenNd2: () => void | Promise<void>;
  onOpenCzi: () => void | Promise<void>;
  recentSources?: readonly SourcePickerRecentItem[];
  onPickRecentSource?: (source: AlignerSource) => void;
};

function formatSourcePath(source: AlignerSource): string {
  return source.path;
}

export function SourcePickerModal(props: SourcePickerModalProps) {
  const handleSelect = async (fn: () => void | Promise<void>) => {
    props.onClose();
    await fn();
  };

  return (
    <ModalScrim open={props.open} onClose={props.onClose}>
      <DialogSurface>
        <DialogTitleText>Open Data</DialogTitleText>
        <DialogDescriptionText>Choose a source format.</DialogDescriptionText>
        {props.recentSources && props.recentSources.length > 0 && props.onPickRecentSource ? (
          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">Recent sources</Text>
            {props.recentSources.map((item) => (
              <Button
                key={`${item.source.kind}:${item.source.path}`}
                label={item.label?.trim() || formatSourcePath(item.source)}
                size="sm"
                variant="outline"
                onPress={() => {
                  props.onClose();
                  props.onPickRecentSource?.(item.source);
                }}
              />
            ))}
          </View>
        ) : null}
        <View className="gap-2">
          <Button label="Folder" onPress={() => void handleSelect(props.onOpenFolder)} />
          <Button label="ND2" onPress={() => void handleSelect(props.onOpenNd2)} />
          <Button label="CZI" onPress={() => void handleSelect(props.onOpenCzi)} />
        </View>
        <DialogActions>
          <Button label="Close" variant="ghost" onPress={props.onClose} />
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}
