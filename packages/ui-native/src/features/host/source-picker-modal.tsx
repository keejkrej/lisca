import type { AlignerSource } from "@lisca/contracts";
import { Pressable, View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";
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
              <Pressable
                key={`${item.source.kind}:${item.source.path}`}
                className="gap-0.5 rounded-md border border-border px-3 py-2 active:bg-muted/30"
                onPress={() => {
                  props.onClose();
                  props.onPickRecentSource?.(item.source);
                }}
              >
                {item.label ? (
                  <Text className="font-medium text-foreground">{item.label}</Text>
                ) : (
                  <Text className="font-medium capitalize text-foreground">{item.source.kind}</Text>
                )}
                <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                  {formatSourcePath(item.source)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View className="gap-2">
          <Button onPress={() => void handleSelect(props.onOpenFolder)}>
            <Text className="text-lg font-medium text-foreground">Folder</Text>
          </Button>
          <Button onPress={() => void handleSelect(props.onOpenNd2)}>
            <Text className="text-lg font-medium text-foreground">ND2</Text>
          </Button>
          <Button onPress={() => void handleSelect(props.onOpenCzi)}>
            <Text className="text-lg font-medium text-foreground">CZI</Text>
          </Button>
        </View>
        <DialogActions>
          <Button variant="ghost" onPress={props.onClose}>
            <Text>Close</Text>
          </Button>
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}
