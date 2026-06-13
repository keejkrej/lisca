import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";

export function StatTile(props: {
  label: ReactNode;
  value: ReactNode;
  centered?: boolean;
  style?: ViewProps["style"];
  className?: string;
}) {
  const align = props.centered ? "text-center" : "text-left";

  return (
    <View
      className={cn("min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-2", props.className)}
      style={props.style}
    >
      <Text className={cn("text-xs text-muted-foreground", align)}>{props.label}</Text>
      <Text className={cn("mt-1 font-medium tabular-nums text-foreground", align)}>
        {props.value}
      </Text>
    </View>
  );
}
