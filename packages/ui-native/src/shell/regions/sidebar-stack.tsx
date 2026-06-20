import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { cn } from "../../../lib/utils";

export function SidebarStack(props: {
  children?: ReactNode;
  style?: ViewProps["style"];
  className?: string;
}) {
  return (
    <View
      className={cn("min-h-0 flex-col gap-2 overflow-hidden p-3", props.className)}
      style={props.style}
    >
      {props.children}
    </View>
  );
}
