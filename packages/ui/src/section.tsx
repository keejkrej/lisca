"use client";

import type { ComponentProps, ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { cn } from "./lib/utils";

export type SectionProps = Omit<ComponentProps<typeof Card>, "title"> & {
  /** Primary heading shown in the section header. */
  title: string;
  description?: string;
  /** Right-aligned slot in the title row (e.g. Reset). */
  headerAction?: ReactNode;
  children?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
};

export function Section({
  title,
  description,
  headerAction,
  children,
  className,
  headerClassName,
  contentClassName,
  ...cardProps
}: SectionProps) {
  return (
    <Card className={cn("border-0 shadow-none", className)} {...cardProps}>
      <CardHeader className={cn("shrink-0 space-y-1.5 px-3 py-3 pb-0", headerClassName)}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 text-sm">{title}</CardTitle>
          {headerAction ? (
            <div className="flex shrink-0 items-center gap-1">{headerAction}</div>
          ) : null}
        </div>
        {description ? (
          <CardDescription className="text-xs">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={cn("space-y-2 px-3 pb-3 pt-2", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
