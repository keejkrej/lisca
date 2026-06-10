import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { Section } from "./section.tsx";

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
      contentStyle={[styles.content, props.contentStyle]}
      defaultCollapsed={props.defaultCollapsed}
      description={props.description}
      headerAction={props.headerAction}
      style={[styles.section, props.style]}
      title={props.title}
    >
      {props.children}
    </Section>
  );
}

const styles = StyleSheet.create({
  section: {
    flexShrink: 0,
    minHeight: 0,
  },
  content: {
    flexDirection: "column",
    gap: 8,
    minHeight: 0,
  },
});
