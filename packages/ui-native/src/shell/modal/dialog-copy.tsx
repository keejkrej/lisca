import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";

const dialogTitleToneClass = {
  h2: "font-display text-lg font-semibold leading-none text-foreground",
  h2Medium: "font-display font-medium text-foreground",
  sans: "font-sans font-medium text-foreground",
} as const;

export function DialogTitleText(props: {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof dialogTitleToneClass;
}) {
  const tone = props.tone ?? "h2";
  return (
    <Text className={cn(dialogTitleToneClass[tone], props.className)}>{props.children}</Text>
  );
}

export function DialogDescriptionText(props: {
  children: ReactNode;
  className?: string;
  numberOfLines?: number;
}) {
  return (
    <Text
      className={cn("text-sm text-muted-foreground", props.className)}
      numberOfLines={props.numberOfLines}
    >
      {props.children}
    </Text>
  );
}

export function DialogActions(props: { children: ReactNode; className?: string }) {
  return (
    <View className={cn("flex-row flex-wrap items-center justify-end gap-2", props.className)}>
      {props.children}
    </View>
  );
}

export function DialogSectionLabel(props: { children: ReactNode; className?: string }) {
  return (
    <Text className={cn("font-display text-sm font-semibold text-foreground", props.className)}>
      {props.children}
    </Text>
  );
}

export function DialogErrorText(props: { children: ReactNode; className?: string }) {
  return (
    <Text className={cn("text-sm text-destructive", props.className)}>{props.children}</Text>
  );
}

export function DialogStack(props: { children: ReactNode; className?: string; style?: ViewProps["style"] }) {
  return (
    <View className={cn("gap-3", props.className)} style={props.style}>
      {props.children}
    </View>
  );
}
