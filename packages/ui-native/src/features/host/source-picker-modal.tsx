import type { AlignerSource } from "@lisca/contracts";
import { Pressable, View } from "react-native";
import { X } from "lucide-react-native";

import { Button } from "../../../components/ui/button";
import { Icon } from "../../../components/ui/icon";
import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";
import { DialogDescriptionText, DialogTitleText } from "../../shell/modal/dialog-copy";
import {
  DialogBody,
  DialogHeader,
  DialogSurface,
  ModalScrim,
} from "../../shell/modal/modal";

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

const sourceOptionClass =
  "min-h-24 w-full items-center justify-center rounded-lg border border-border bg-muted/20 px-4 py-5 active:border-primary/35 active:bg-primary/10";

export function SourcePickerModal(props: SourcePickerModalProps) {
  if (!props.open) return null;

  const handleSelect = async (fn: () => void | Promise<void>) => {
    props.onClose();
    await fn();
  };

  return (
    <ModalScrim open={props.open} onClose={props.onClose}>
      <DialogSurface maxWidth={512} padded={false}>
        <DialogHeader>
          <View className="w-full flex-row items-start justify-between gap-4">
            <View className="min-w-0 flex-1 gap-1">
              <DialogTitleText>Open Data</DialogTitleText>
              <DialogDescriptionText>Choose a source format.</DialogDescriptionText>
            </View>
            <Button
              accessibilityLabel="Close open data modal"
              className="shrink-0"
              size="icon"
              variant="ghost"
              onPress={props.onClose}
            >
              <Icon as={X} className="size-4" size={16} strokeWidth={2} />
            </Button>
          </View>
        </DialogHeader>

        <DialogBody className="gap-4">
          {props.recentSources && props.recentSources.length > 0 && props.onPickRecentSource ? (
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">Recent sources</Text>
              <View className="max-h-32 overflow-hidden rounded-md border border-border">
                {props.recentSources.map((item) => (
                  <Pressable
                    key={`${item.source.kind}:${item.source.path}`}
                    className="gap-0.5 border-b border-border/60 px-3 py-2 active:bg-muted/30"
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
            </View>
          ) : null}

          <View className="w-full flex-row gap-3">
            <Pressable
              className={cn(sourceOptionClass, "min-w-0 flex-1")}
              onPress={() => void handleSelect(props.onOpenFolder)}
            >
              <Text className="text-lg font-medium text-foreground">Folder</Text>
            </Pressable>
            <Pressable
              className={cn(sourceOptionClass, "min-w-0 flex-1")}
              onPress={() => void handleSelect(props.onOpenNd2)}
            >
              <Text className="text-lg font-medium text-foreground">ND2</Text>
            </Pressable>
            <Pressable
              className={cn(sourceOptionClass, "min-w-0 flex-1")}
              onPress={() => void handleSelect(props.onOpenCzi)}
            >
              <Text className="text-lg font-medium text-foreground">CZI</Text>
            </Pressable>
          </View>
        </DialogBody>
      </DialogSurface>
    </ModalScrim>
  );
}
