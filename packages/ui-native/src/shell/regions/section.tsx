import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Pressable, View, type ViewProps } from "react-native";

import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";
import { shellThemeColors, type ShellThemeMode } from "../../theme/tokens";

export function Section(props: {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  children?: ReactNode;
  defaultCollapsed?: boolean;
  contentStyle?: ViewProps["style"];
  contentClassName?: string;
  style?: ViewProps["style"];
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(props.defaultCollapsed ?? false);
  const CollapseIcon = collapsed ? ChevronRight : ChevronDown;
  const { colorScheme } = useColorScheme();
  const mode: ShellThemeMode = colorScheme === "dark" ? "dark" : "light";
  const iconColor = shellThemeColors[mode].mutedForeground;

  return (
    <View
      className={cn("overflow-hidden rounded-xl border border-border bg-background", props.className)}
      style={props.style}
    >
      <View className="gap-1.5 px-3 py-3">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="min-w-0 flex-1 text-sm font-semibold leading-[14px] text-foreground">
            {props.title}
          </Text>
          <View className="shrink-0 flex-row items-center gap-1">
            {props.headerAction}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={collapsed ? `Expand ${props.title}` : `Collapse ${props.title}`}
              accessibilityState={{ expanded: !collapsed }}
              className="-mr-1 -mt-1 h-6 w-6 items-center justify-center rounded-lg"
              hitSlop={8}
              onPress={() => setCollapsed((current) => !current)}
            >
              <CollapseIcon color={iconColor} size={16} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
        {props.description ? (
          <Text className="text-sm text-muted-foreground">{props.description}</Text>
        ) : null}
      </View>
      {!collapsed ? (
        <View className={cn("flex flex-col gap-2 px-3 pb-3", props.contentClassName)} style={props.contentStyle}>
          {props.children}
        </View>
      ) : null}
    </View>
  );
}
