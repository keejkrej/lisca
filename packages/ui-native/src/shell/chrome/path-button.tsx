import type { ReactNode } from "react";
import { View } from "react-native";

import { Button as UiButton } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";

function basename(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return null;
  return last.replace(/\.[^./\\]+$/, "");
}

export function PathButton(props: {
  label: string;
  value: string | null;
  icon?: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const display = basename(props.value) ?? props.label;
  const disabled = Boolean(props.disabled) || props.onPress == null;

  return (
    <UiButton
      accessibilityLabel={props.value ?? props.label}
      accessibilityState={{ disabled }}
      className="max-w-72 min-w-0 shrink justify-start gap-2 font-normal"
      disabled={disabled}
      size="sm"
      variant="outline"
      onPress={disabled ? undefined : props.onPress}
    >
      {props.icon ? <View className="shrink-0">{props.icon}</View> : null}
      <Text className="min-w-0 shrink truncate font-normal" numberOfLines={1}>
        {display}
      </Text>
    </UiButton>
  );
}
