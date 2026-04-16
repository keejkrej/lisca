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

type AlertDialogContextValue = {
  descriptionId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  titleId: string;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext(name: string) {
  const value = useContext(AlertDialogContext);
  if (!value) {
    throw new Error(`${name} must be used within AlertDialog`);
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

interface AlertDialogProps {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function AlertDialog({ children, onOpenChange, open }: AlertDialogProps) {
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

  const value = useMemo<AlertDialogContextValue>(
    () => ({
      descriptionId,
      onOpenChange,
      open,
      titleId,
    }),
    [descriptionId, onOpenChange, open, titleId],
  );

  return <AlertDialogContext.Provider value={value}>{children}</AlertDialogContext.Provider>;
}

function AlertDialogPopup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { descriptionId, open, titleId } = useAlertDialogContext("AlertDialogPopup");
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-6" role="presentation">
      <div
        className={cn(
          "w-full max-w-md rounded-2xl border border-border/80 bg-card shadow-2xl",
          className,
        )}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        {children}
      </div>
    </div>,
    document.body,
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
  const { titleId } = useAlertDialogContext("AlertDialogTitle");
  return (
    <h2 id={titleId} className={cn("text-base font-medium text-foreground", className)}>
      {children}
    </h2>
  );
}

function AlertDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { descriptionId } = useAlertDialogContext("AlertDialogDescription");
  return (
    <p id={descriptionId} className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
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
  onClick,
  render,
}: {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  render?: CloseRenderer;
}) {
  const { onOpenChange } = useAlertDialogContext("AlertDialogClose");
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
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPanel,
  AlertDialogPopup,
  AlertDialogTitle,
};
