import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { cn } from "../../../lib/utils";

export function DockStrip(props: { children?: ReactNode; style?: ViewProps["style"]; className?: string }) {
  return (
    <View
      className={cn(
        "min-h-0 w-full flex-1 flex-row items-stretch justify-center gap-3 p-3",
        props.className,
      )}
      style={props.style}
    >
      {props.children}
    </View>
  );
}
