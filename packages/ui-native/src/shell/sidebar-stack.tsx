import type { ReactNode } from "react";
import { View } from "react-native";

import { sidebarStackStyle } from "./section-placement.ts";

export function SidebarStack(props: { children?: ReactNode; style?: object }) {
  return <View style={[sidebarStackStyle, props.style]}>{props.children}</View>;
}
