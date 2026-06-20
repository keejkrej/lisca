import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({ className, children, ...props }: ViewProps & { children?: ReactNode }) {
  return (
    <View className={cn("flex min-w-0 flex-col items-start gap-2", className)} {...props}>
      {children}
    </View>
  );
}

export function FieldLabel({ className, children, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      className={cn(
        "inline-flex w-full items-center gap-2 font-medium text-foreground text-sm leading-4",
        className,
      )}
      {...props}
    >
      {children}
    </Label>
  );
}

export function FieldDescription({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Label className={cn("font-normal text-muted-foreground text-xs", className)}>{children}</Label>
  );
}
