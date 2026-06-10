import type { ReactNode } from "react";

import { Section } from "./section.tsx";
import { dockSectionContentStyle, dockSectionStyle } from "./section-placement.ts";

export function DockSection(props: {
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
      contentStyle={[dockSectionContentStyle, props.contentStyle]}
      defaultCollapsed={props.defaultCollapsed}
      description={props.description}
      headerAction={props.headerAction}
      style={[dockSectionStyle, props.style]}
      title={props.title}
    >
      {props.children}
    </Section>
  );
}
