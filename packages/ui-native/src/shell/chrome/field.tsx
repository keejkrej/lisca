import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { Label } from "../../../components/ui/label";
import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";

export function Field(props: {
  label: string;
  valueLabel?: string;
  children: ReactNode;
  style?: ViewProps["style"];
  className?: string;
}) {
  return (
    <View className={cn("w-full min-w-0 gap-1.5", props.className)} style={props.style}>
      <View className="w-full flex-row items-center justify-between gap-2">
        <FieldLabel>{props.label}</FieldLabel>
        {props.valueLabel ? (
          <Text className="text-xs text-muted-foreground" variant="muted">
            {props.valueLabel}
          </Text>
        ) : null}
      </View>
      {props.children}
    </View>
  );
}

export function FieldLabel(props: { children: ReactNode; className?: string }) {
  return (
    <Label className={cn("text-xs font-medium text-muted-foreground", props.className)}>
      {props.children}
    </Label>
  );
}
