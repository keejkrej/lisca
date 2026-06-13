import type { ReactNode } from "react";
import type { ViewProps } from "react-native";

import { cn } from "../../../lib/utils";
import { Section } from "./section";

export type DockSectionFit = "hug" | "panel";

export function DockSection(props: {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  children?: ReactNode;
  defaultCollapsed?: boolean;
  contentStyle?: ViewProps["style"];
  contentClassName?: string;
  style?: ViewProps["style"];
  className?: string;
  /** `hug` (default) shrinks to content; `panel` uses a stable instruction band. */
  fit?: DockSectionFit;
}) {
  const fitClassName =
    props.fit === "panel" ? "max-w-80 min-w-56 self-stretch shrink-0" : "max-w-full min-w-0 self-stretch shrink-0";

  return (
    <Section
      className={cn(fitClassName, props.className)}
      contentClassName={cn("min-h-0 flex-1 justify-start gap-2", props.contentClassName)}
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
