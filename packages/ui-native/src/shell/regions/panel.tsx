import type { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";
import { useThemeColors } from "../../theme/use-theme-colors";

export function Spinner(props: { size?: "small" | "large"; className?: string }) {
  const colors = useThemeColors();

  return (
    <View className={cn("items-center justify-center p-4", props.className)}>
      <ActivityIndicator color={colors.primary} size={props.size ?? "large"} />
    </View>
  );
}

export function Panel(props: { title?: string; children: ReactNode; className?: string }) {
  return (
    <View
      className={cn("gap-2 rounded-xl border border-border bg-background p-3", props.className)}
    >
      {props.title ? (
        <Text className="font-display text-sm font-semibold leading-5 text-foreground">
          {props.title}
        </Text>
      ) : null}
      {props.children}
    </View>
  );
}
