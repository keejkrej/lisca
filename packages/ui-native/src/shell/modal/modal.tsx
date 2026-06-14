import * as DialogPrimitive from "@rn-primitives/dialog";
import { createContext, useContext, type ReactNode } from "react";
import { Platform, View, useWindowDimensions, type ViewProps } from "react-native";

import { Dialog, DialogOverlay, DialogPortal } from "../../../components/ui/dialog";
import { cn } from "../../../lib/utils";

const ShellDialogContext = createContext(false);

/** Pixel widths aligned with web `DialogSurface` Tailwind tokens. */
export const DIALOG_MAX_WIDTH = {
  sm: 448,
  lg: 512,
  xl: 576,
  "2xl": 672,
} as const;

const DIALOG_HORIZONTAL_INSET = Platform.select({ web: 48, default: 16 }) ?? 16;

function ShellDialogContent({
  accessibilityLabel,
  children,
  maxWidth = DIALOG_MAX_WIDTH.sm,
  padded = true,
}: {
  accessibilityLabel?: string;
  children: ReactNode;
  maxWidth?: number;
  padded?: boolean;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const dialogWidth = Math.min(maxWidth, Math.max(0, windowWidth - DIALOG_HORIZONTAL_INSET));

  return (
    <DialogPortal>
      <DialogOverlay
        className={Platform.select({
          web: "bg-black/55 px-6 py-4 backdrop-blur-sm",
        })}
      >
        <DialogPrimitive.Content
          accessibilityLabel={accessibilityLabel}
          className={cn(
            "bg-background border-border z-50 mx-auto flex max-w-full flex-col rounded-2xl border shadow-lg shadow-black/5",
            padded ? "gap-4 p-5" : "gap-0 p-0",
            Platform.select({
              web: "animate-in fade-in-0 zoom-in-95 duration-200",
            }),
          )}
          style={{ maxWidth: dialogWidth, width: dialogWidth }}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
}

export function ModalScrim(props: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!props.open) return null;

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open: boolean) => {
        if (!open) props.onClose();
      }}
    >
      <ShellDialogContext.Provider value={true}>{props.children}</ShellDialogContext.Provider>
    </Dialog>
  );
}

export function DialogSurface(props: {
  children: ReactNode;
  maxWidth?: number;
  padded?: boolean;
  accessibilityLabel?: string;
}) {
  const inShellDialog = useContext(ShellDialogContext);
  if (!inShellDialog) {
    throw new Error("DialogSurface must be rendered inside ModalScrim");
  }

  return (
    <ShellDialogContent
      accessibilityLabel={props.accessibilityLabel}
      maxWidth={props.maxWidth}
      padded={props.padded}
    >
      {props.children}
    </ShellDialogContent>
  );
}

export function DialogHeader(props: { children: ReactNode }) {
  return (
    <View className="border-border border-b px-5 py-4">{props.children}</View>
  );
}

export function DialogBody(props: { children: ReactNode; style?: ViewProps["style"]; className?: string }) {
  return (
    <View className={cn("gap-4 px-5 py-4", props.className)} style={props.style}>
      {props.children}
    </View>
  );
}

export function DialogFooter(props: { children: ReactNode }) {
  return (
    <View className="border-border flex-row flex-wrap items-center justify-end gap-2 border-t px-5 py-4">
      {props.children}
    </View>
  );
}
