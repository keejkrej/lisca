import type { ReactNode } from "react";
import { ScrollView, type ViewProps } from "react-native";

import { cn } from "../../../lib/utils";

export function DockStrip(props: {
  children?: ReactNode;
  style?: ViewProps["style"];
  className?: string;
}) {
  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator
      className={cn("h-full min-h-0 w-full", props.className)}
      contentContainerClassName="min-h-full flex-row items-stretch justify-center gap-3 p-3"
      contentContainerStyle={{ flexGrow: 1 }}
      style={props.style}
    >
      {props.children}
    </ScrollView>
  );
}
