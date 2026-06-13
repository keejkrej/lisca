import { View } from "react-native";

import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";

export function ReadonlyPathField(props: {
  value: string;
  className?: string;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessibilityLabel={props.accessibilityLabel ?? `Path ${props.value}`}
      className={cn(
        "h-8 min-w-0 w-full items-center self-stretch rounded-md border border-border bg-muted/20 px-2",
        props.className,
      )}
    >
      <Text className="w-full font-mono text-xs text-foreground" numberOfLines={1}>
        {props.value}
      </Text>
    </View>
  );
}
