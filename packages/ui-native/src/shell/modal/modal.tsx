import * as DialogPrimitive from "@rn-primitives/dialog";
import { createContext, useContext, type ReactNode } from "react";
import { Platform, View, type ViewProps } from "react-native";

import { Dialog, DialogOverlay, DialogPortal } from "../../../components/ui/dialog";
import { cn } from "../../../lib/utils";

const ShellDialogContext = createContext(false);

function ShellDialogContent({
  accessibilityLabel,
  children,
  maxWidth = 480,
  padded = true,
}: {
  accessibilityLabel?: string;
  children: ReactNode;
  maxWidth?: number;
  padded?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay>
        <DialogPrimitive.Content
          accessibilityLabel={accessibilityLabel}
          className={cn(
            "bg-background border-border z-50 mx-auto w-full flex-col rounded-2xl border shadow-lg shadow-black/5",
            padded ? "gap-4 p-5" : "gap-0 p-0",
            Platform.select({
              web: "animate-in fade-in-0 zoom-in-95 duration-200",
            }),
          )}
          style={{ maxWidth }}
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
