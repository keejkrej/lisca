import { ActivityIndicator, type ViewStyle } from "react-native";

import { Button as UiButton } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";
import { ToggleGroup, ToggleGroupItem } from "../../../components/ui/toggle-group";
import { cn } from "../../../lib/utils";

export function Button(props: {
  label: string;
  onPress?: () => void;
  variant?: "default" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
  compact?: boolean;
  size?: "sm" | "default";
  loading?: boolean;
  style?: ViewStyle;
  className?: string;
}) {
  const variant = props.variant ?? "default";
  const size = props.size ?? (props.compact ? "sm" : "default");
  const disabled = props.disabled || props.loading;

  return (
    <UiButton
      className={cn(props.compact && "shrink-0", props.className)}
      disabled={disabled}
      size={size}
      style={props.style}
      variant={variant}
      onPress={props.onPress}
    >
      {props.loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <Text className="text-center" numberOfLines={size === "sm" ? 1 : 2}>
          {props.label}
        </Text>
      )}
    </UiButton>
  );
}

export function SegmentedToggle(props: {
  value: string;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <ToggleGroup
      className="w-full"
      disabled={props.disabled}
      type="single"
      value={props.value}
      variant="outline"
      onValueChange={(value: string | undefined) => {
        if (value) props.onChange(value);
      }}
    >
      {props.options.map((option, index) => (
        <ToggleGroupItem
          key={option.value}
          className="min-h-9 flex-1 py-2"
          isFirst={index === 0}
          isLast={index === props.options.length - 1}
          value={option.value}
        >
          <Text className="text-center" variant="small">
            {option.label}
          </Text>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
