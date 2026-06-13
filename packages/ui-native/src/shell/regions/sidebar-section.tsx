import type { ReactNode } from "react";
import type { ViewProps } from "react-native";

import { cn } from "../../../lib/utils";
import { Section } from "./section";

export function SidebarSection(props: {
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
  return (
    <Section
      className={cn("min-h-0 shrink-0", props.className)}
      contentClassName={cn("min-h-0 flex-col gap-2", props.contentClassName)}
      contentStyle={props.contentStyle}
      defaultCollapsed={props.defaultCollapsed}
      description={props.description}
      headerAction={props.headerAction}
      style={props.style}
      title={props.title}
    >
      {props.children}
    </Section>
  );
}
