import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { Section } from "./section.tsx";
import { sidebarSectionContentStyle, sidebarSectionStyle } from "./section-placement.ts";

export function SidebarSection(props: {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  children?: ReactNode;
  defaultCollapsed?: boolean;
  contentStyle?: object;
  style?: object;
}) {
  return (
    <Section
      contentStyle={[sidebarSectionContentStyle, props.contentStyle]}
      defaultCollapsed={props.defaultCollapsed}
      description={props.description}
      headerAction={props.headerAction}
      style={[sidebarSectionStyle, props.style]}
      title={props.title}
    >
      {props.children}
    </Section>
  );
}
