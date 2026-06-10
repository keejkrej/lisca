import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { Section } from "./section";

export type DockSectionFit = "hug" | "panel";

export function DockSection(props: {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  children?: ReactNode;
  defaultCollapsed?: boolean;
  contentStyle?: object;
  style?: object;
  /** `hug` (default) shrinks to content; `panel` uses a stable instruction band. */
  fit?: DockSectionFit;
}) {
  const sectionStyle = props.fit === "panel" ? styles.panel : styles.hug;

  return (
    <Section
      contentStyle={[styles.content, props.contentStyle]}
      defaultCollapsed={props.defaultCollapsed}
      description={props.description}
      headerAction={props.headerAction}
      style={[sectionStyle, props.style]}
      title={props.title}
    >
      {props.children}
    </Section>
  );
}

const styles = StyleSheet.create({
  hug: {
    alignSelf: "stretch",
    flexDirection: "column",
    flexShrink: 0,
    maxWidth: "100%",
    minWidth: 0,
  },
  panel: {
    alignSelf: "stretch",
    flexDirection: "column",
    flexShrink: 0,
    maxWidth: 320,
    minWidth: 224,
  },
  content: {
    flex: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 0,
  },
});
