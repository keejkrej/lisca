import { Pressable, View } from "react-native";

import { Button as UiButton } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";
import type { ConnectionState } from "../server/use-shell-ws-probe";

const STATUS_LABELS: Record<ConnectionState, string> = {
  idle: "Idle",
  connecting: "Connecting…",
  open: "Connected",
  closed: "Disconnected",
};

const DOT_CLASS: Record<ConnectionState, string> = {
  idle: "bg-muted-foreground/40",
  connecting: "bg-amber-400",
  open: "bg-emerald-500",
  closed: "bg-muted-foreground/40",
};

function ConnectionStatusContent(props: {
  state: ConnectionState;
  title: string;
  statusLabel: string;
}) {
  return (
    <>
      <View className={cn("h-2 w-2 shrink-0 rounded-full", DOT_CLASS[props.state])} />
      <Text className="shrink-0 text-sm font-medium text-foreground">{props.title}</Text>
      <Text className="shrink-0 text-sm text-foreground/70">{props.statusLabel}</Text>
    </>
  );
}

export function ConnectionStatus(props: {
  state: ConnectionState;
  wsUrl?: string;
  label?: string;
  onOpenSettings?: () => void;
}) {
  const title = props.label ?? "Server";
  const statusLabel = STATUS_LABELS[props.state];

  if (props.onOpenSettings) {
    return (
      <UiButton
        accessibilityLabel={`${title}, ${statusLabel}`}
        className="h-8 shrink-0 gap-1.5 px-2.5"
        variant="outline"
        onPress={props.onOpenSettings}
      >
        <ConnectionStatusContent state={props.state} statusLabel={statusLabel} title={title} />
      </UiButton>
    );
  }

  return (
    <View
      accessibilityRole="text"
      className="h-8 shrink-0 flex-row items-center justify-center gap-1.5 rounded-[10px] border border-input bg-background px-2.5 shadow-sm shadow-black/5"
    >
      <ConnectionStatusContent state={props.state} statusLabel={statusLabel} title={title} />
    </View>
  );
}
