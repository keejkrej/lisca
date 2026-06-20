import { useState } from "react";
import { ScrollView, View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { DialogActions, DialogDescriptionText, DialogTitleText } from "../modal/dialog-copy";
import { DialogSurface, ModalScrim } from "../modal/modal";

export type ServerAddressDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPort: number;
  localLabel: string;
  currentHttpBaseUrl: string;
  activeAddress: string | null;
  savedServers: string[];
  onConnect: (address: string | null) => void;
  onAddServer: (address: string) => void;
  onRemoveServer: (address: string) => void;
};

export function ServerAddressDialog(props: ServerAddressDialogProps) {
  const [draft, setDraft] = useState("");

  return (
    <ModalScrim open={props.open} onClose={() => props.onOpenChange(false)}>
      <DialogSurface maxWidth={520}>
        <DialogTitleText>Server address</DialogTitleText>
        <DialogDescriptionText>{props.currentHttpBaseUrl}</DialogDescriptionText>

        <Button
          variant="outline"
          onPress={() => {
            props.onConnect(null);
            props.onOpenChange(false);
          }}
        >
          <Text>{`Local (${props.localLabel})`}</Text>
        </Button>

        <ScrollView className="max-h-44">
          {props.savedServers.map((server) => (
            <View
              key={server}
              className="flex-row items-center justify-between border-b border-border py-2.5"
            >
              <Button
                className="min-w-0 flex-1"
                variant="ghost"
                onPress={() => {
                  props.onConnect(server);
                  props.onOpenChange(false);
                }}
              >
                <Text numberOfLines={1}>{server}</Text>
              </Button>
              <Button variant="destructive" onPress={() => props.onRemoveServer(server)}>
                <Text>Remove</Text>
              </Button>
            </View>
          ))}
        </ScrollView>

        <Input
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={`host:${props.defaultPort}`}
          value={draft}
          onChangeText={setDraft}
        />

        <DialogActions className="justify-between">
          <Button variant="ghost" onPress={() => props.onOpenChange(false)}>
            <Text>Close</Text>
          </Button>
          <Button
            onPress={() => {
              const trimmed = draft.trim();
              if (!trimmed) return;
              props.onAddServer(trimmed);
              props.onConnect(trimmed);
              setDraft("");
              props.onOpenChange(false);
            }}
          >
            <Text>Add & connect</Text>
          </Button>
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}
