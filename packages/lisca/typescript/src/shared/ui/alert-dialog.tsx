"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type * as React from "react";

import { cn } from "./utils";

type AlertDialogProps = Omit<AlertDialogPrimitive.Root.Props, "children" | "onOpenChange"> & {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
};

function AlertDialog({ children, onOpenChange, ...props }: AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root
      onOpenChange={(open) => onOpenChange?.(open)}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Root>
  );
}

function AlertDialogTrigger(
  props: AlertDialogPrimitive.Trigger.Props,
): React.ReactElement {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

type AlertDialogPopupProps = AlertDialogPrimitive.Popup.Props & {
  portalProps?: AlertDialogPrimitive.Portal.Props;
};

function AlertDialogPopup({
  children,
  className,
  portalProps,
  ...props
}: AlertDialogPopupProps) {
  return (
    <AlertDialogPrimitive.Portal {...portalProps}>
      <AlertDialogPrimitive.Backdrop
        className="fixed inset-0 z-[110] bg-black/50"
        data-slot="alert-dialog-backdrop"
      />
      <AlertDialogPrimitive.Viewport
        className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6"
        data-slot="alert-dialog-viewport"
      >
        <AlertDialogPrimitive.Popup
          className={cn(
            "w-full max-w-md rounded-2xl border border-border/80 bg-card shadow-2xl outline-none",
            className,
          )}
          data-slot="alert-dialog-popup"
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-1 px-6 pt-6", className)}>{children}</div>;
}

function AlertDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("text-base font-medium text-foreground", className)}
      data-slot="alert-dialog-title"
    >
      {children}
    </AlertDialogPrimitive.Title>
  );
}

function AlertDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="alert-dialog-description"
    >
      {children}
    </AlertDialogPrimitive.Description>
  );
}

function AlertDialogPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}

function AlertDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex justify-end gap-2 px-6 pb-6", className)}>{children}</div>;
}

function AlertDialogClose({
  children,
  ...props
}: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close data-slot="alert-dialog-close" type="button" {...props}>
      {children}
    </AlertDialogPrimitive.Close>
  );
}

export {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPanel,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
};
