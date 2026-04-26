"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import * as React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { cn } from "./utils";

type DialogOptionsContextValue = {
  setDisablePointerDismissal: (disabled: boolean) => void;
};

const DialogOptionsContext = createContext<DialogOptionsContextValue | null>(null);

type DialogProps = Omit<DialogPrimitive.Root.Props, "children" | "onOpenChange"> & {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
};

function Dialog({ children, onOpenChange, ...props }: DialogProps) {
  const [disablePointerDismissal, setDisablePointerDismissal] = useState(false);
  const contextValue = useMemo<DialogOptionsContextValue>(
    () => ({ setDisablePointerDismissal }),
    [],
  );

  return (
    <DialogPrimitive.Root
      disablePointerDismissal={disablePointerDismissal}
      onOpenChange={(open) => onOpenChange?.(open)}
      {...props}
    >
      <DialogOptionsContext.Provider value={contextValue}>
        {children}
      </DialogOptionsContext.Provider>
    </DialogPrimitive.Root>
  );
}

function DialogTrigger(
  props: DialogPrimitive.Trigger.Props,
): React.ReactElement {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

type DialogPopupProps = DialogPrimitive.Popup.Props & {
  closeOnOutsideClick?: boolean;
  overlayClassName?: string;
  portalProps?: DialogPrimitive.Portal.Props;
};

function DialogPopup({
  children,
  className,
  closeOnOutsideClick = true,
  overlayClassName,
  portalProps,
  ...props
}: DialogPopupProps) {
  const options = useContext(DialogOptionsContext);

  useEffect(() => {
    options?.setDisablePointerDismissal(!closeOnOutsideClick);
    return () => options?.setDisablePointerDismissal(false);
  }, [closeOnOutsideClick, options]);

  return (
    <DialogPrimitive.Portal {...portalProps}>
      <DialogPrimitive.Backdrop
        className={cn("fixed inset-0 z-[100] bg-black/50", overlayClassName)}
        data-slot="dialog-backdrop"
      />
      <DialogPrimitive.Viewport
        className={cn(
          "fixed inset-0 z-[100] flex items-center justify-center px-4 py-6",
          overlayClassName,
        )}
        data-slot="dialog-viewport"
      >
        <DialogPrimitive.Popup
          className={cn(
            "flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl outline-none",
            className,
          )}
          data-slot="dialog-popup"
          {...props}
        >
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("shrink-0 border-b border-border px-4 py-3", className)}>{children}</div>;
}

function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Title
      className={cn("text-sm font-medium text-foreground", className)}
      data-slot="dialog-title"
    >
      {children}
    </DialogPrimitive.Title>
  );
}

function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1 text-sm text-muted-foreground", className)}
      data-slot="dialog-description"
    >
      {children}
    </DialogPrimitive.Description>
  );
}

function DialogPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("min-h-0 min-w-0 flex-1 overflow-hidden", className)}>{children}</div>;
}

function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 flex-row justify-end gap-2 border-t border-border px-4 py-3", className)}>
      {children}
    </div>
  );
}

function DialogClose({
  children,
  ...props
}: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close data-slot="dialog-close" type="button" {...props}>
      {children}
    </DialogPrimitive.Close>
  );
}

export {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
};
