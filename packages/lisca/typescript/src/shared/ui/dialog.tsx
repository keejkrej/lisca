"use client";

import * as React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "./utils";

type CloseRenderer = React.ReactElement<{
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
}>;

type DialogContextValue = {
  descriptionId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  titleId: string;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(name: string) {
  const value = useContext(DialogContext);
  if (!value) {
    throw new Error(`${name} must be used within Dialog`);
  }
  return value;
}

function composeHandlers<T extends HTMLElement>(
  first?: React.MouseEventHandler<T>,
  second?: React.MouseEventHandler<T>,
) {
  return (event: React.MouseEvent<T>) => {
    first?.(event);
    if (!event.defaultPrevented) {
      second?.(event);
    }
  };
}

interface DialogProps {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function Dialog({ children, onOpenChange, open }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  const value = useMemo<DialogContextValue>(
    () => ({
      descriptionId,
      onOpenChange,
      open,
      titleId,
    }),
    [descriptionId, onOpenChange, open, titleId],
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

interface DialogPopupProps {
  children: React.ReactNode;
  className?: string;
  closeOnOutsideClick?: boolean;
  overlayClassName?: string;
}

function DialogPopup({
  children,
  className,
  closeOnOutsideClick = true,
  overlayClassName,
}: DialogPopupProps) {
  const { descriptionId, onOpenChange, open, titleId } = useDialogContext("DialogPopup");
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6",
        overlayClassName,
      )}
      role="presentation"
      onMouseDown={(event) => {
        if (closeOnOutsideClick && event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        className={cn(
          "flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
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
  const { titleId } = useDialogContext("DialogTitle");
  return (
    <h2 id={titleId} className={cn("text-sm font-medium text-foreground", className)}>
      {children}
    </h2>
  );
}

function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { descriptionId } = useDialogContext("DialogDescription");
  return (
    <p id={descriptionId} className={cn("mt-1 text-sm text-muted-foreground", className)}>
      {children}
    </p>
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

interface DialogCloseProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  render?: CloseRenderer;
}

function DialogClose({ children, onClick, render }: DialogCloseProps) {
  const { onOpenChange } = useDialogContext("DialogClose");
  const handleClick: React.MouseEventHandler<HTMLElement> = (event) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      onOpenChange(false);
    }
  };

  if (render) {
    return React.cloneElement(render, {
      children,
      onClick: composeHandlers(render.props.onClick, handleClick),
    });
  }

  return <button type="button" onClick={handleClick}>{children}</button>;
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
};
