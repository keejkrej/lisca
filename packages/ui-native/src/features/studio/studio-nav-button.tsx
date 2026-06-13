import type { ReactNode } from "react";
import { Pressable } from "react-native";

import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";

export function StudioNavButton(props: {
  active: boolean;
  children: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: props.active }}
      className="w-full items-center rounded-lg px-5 py-2.5 active:opacity-70"
      onPress={props.onPress}
    >
      <Text
        className={cn(
          "text-center text-xl font-medium leading-tight",
          props.active ? "text-foreground" : "text-muted-foreground",
        )}
        numberOfLines={2}
      >
        {props.children}
      </Text>
    </Pressable>
  );
}
