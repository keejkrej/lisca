import { Pressable, View } from "react-native";

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

const CHROME_CLASSNAME =
  "shrink-0 flex-row h-8 items-center gap-1.5 rounded-[10px] border border-input bg-popover px-2.5 shadow-sm shadow-black/5 dark:bg-input/30";

function ConnectionStatusContent(props: {
  state: ConnectionState;
  title: string;
  statusLabel: string;
}) {
  return (
    <>
      <View className={cn("relative top-0.5 h-2 w-2 shrink-0 rounded-full", DOT_CLASS[props.state])} />
      <Text className="relative top-0.5 shrink-0 text-sm font-medium leading-none text-foreground">
        {props.title}
      </Text>
      <Text className="relative top-0.5 shrink-0 text-sm leading-none text-foreground/70">
        {props.statusLabel}
      </Text>
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
  const accessibilityLabel = props.onOpenSettings
    ? `${title}, ${statusLabel}. Change server address.`
    : `${title}, ${statusLabel}`;

  if (props.onOpenSettings) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        className={cn(CHROME_CLASSNAME, "active:bg-accent/50 dark:active:bg-input/64")}
        onPress={props.onOpenSettings}
      >
        <ConnectionStatusContent state={props.state} statusLabel={statusLabel} title={title} />
      </Pressable>
    );
  }

  return (
    <View accessibilityRole="text" accessibilityLabel={accessibilityLabel} className={CHROME_CLASSNAME}>
      <ConnectionStatusContent state={props.state} statusLabel={statusLabel} title={title} />
    </View>
  );
}
