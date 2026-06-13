import type { ReactNode } from "react";

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
  const disabled = props.disabled ?? !props.onPress;

  return (
    <UiButton
      accessibilityLabel={props.value ?? props.label}
      className="max-w-72 min-w-0 shrink"
      disabled={disabled}
      variant="outline"
      onPress={props.onPress}
    >
      {props.icon}
      <Text className="min-w-0 shrink" numberOfLines={1}>
        {display}
      </Text>
    </UiButton>
  );
}
