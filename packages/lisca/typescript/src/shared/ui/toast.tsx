"use client";

import { X } from "lucide-react";
import type * as React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "./button";
import { cn } from "./utils";

export type ToastVariant = "default" | "success" | "error" | "info" | "warning";

export interface ToastDescriptor {
  description?: string;
  duration?: number;
  id?: string;
  title: string;
  variant?: ToastVariant;
}

interface ToastRecord extends Required<Omit<ToastDescriptor, "description" | "variant">> {
  description?: string;
  variant: ToastVariant;
}

type ToastListener = () => void;

let toastState: ToastRecord[] = [];
const toastListeners = new Set<ToastListener>();
const toastTimers = new Map<string, number>();

function emitToastChange() {
  for (const listener of toastListeners) {
    listener();
  }
}

function normalizeToast(input: ToastDescriptor): ToastRecord {
  return {
    description: input.description,
    duration: input.duration ?? 3000,
    id: input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    variant: input.variant ?? "default",
  };
}

function removeToast(id: string) {
  toastState = toastState.filter((toast) => toast.id !== id);
  const timer = toastTimers.get(id);
  if (timer !== undefined) {
    globalThis.clearTimeout(timer);
    toastTimers.delete(id);
  }
  emitToastChange();
}

function scheduleToastRemoval(toast: ToastRecord) {
  if (typeof window === "undefined" || toast.duration <= 0) return;
  const existing = toastTimers.get(toast.id);
  if (existing !== undefined) {
    globalThis.clearTimeout(existing);
  }
  const timer = window.setTimeout(() => removeToast(toast.id), toast.duration);
  toastTimers.set(toast.id, timer);
}

export const toastManager = {
  add(input: ToastDescriptor) {
    const toast = normalizeToast(input);
    const existingIndex = toastState.findIndex((entry) => entry.id === toast.id);
    if (existingIndex >= 0) {
      toastState = toastState.map((entry, index) => (index === existingIndex ? toast : entry));
    } else {
      toastState = [...toastState, toast];
    }
    scheduleToastRemoval(toast);
    emitToastChange();
    return toast.id;
  },
  clear() {
    for (const timer of toastTimers.values()) {
      globalThis.clearTimeout(timer);
    }
    toastTimers.clear();
    toastState = [];
    emitToastChange();
  },
  dismiss(id?: string) {
    if (!id) {
      this.clear();
      return;
    }
    removeToast(id);
  },
  subscribe(listener: ToastListener) {
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  },
};

export const anchoredToastManager = {
  add(input: ToastDescriptor & { positionerProps?: { anchor?: Element | null } }) {
    return toastManager.add(input);
  },
  dismiss(id?: string) {
    toastManager.dismiss(id);
  },
};

const ToastContext = createContext<ToastRecord[] | null>(null);

function useToastSnapshot() {
  const [toasts, setToasts] = useState<ToastRecord[]>(toastState);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(() => setToasts([...toastState]));
    return () => {
      unsubscribe();
    };
  }, []);

  return toasts;
}

function ToastViewport() {
  const toasts = useContext(ToastContext);
  if (!toasts || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[120] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto w-full max-w-sm rounded-xl border bg-card p-4 shadow-xl sm:w-[24rem]",
            toast.variant === "default" && "border-border",
            toast.variant === "success" && "border-emerald-500/30 bg-emerald-500/10",
            toast.variant === "error" && "border-destructive/30 bg-destructive/10",
            toast.variant === "info" && "border-sky-500/30 bg-sky-500/10",
            toast.variant === "warning" && "border-amber-500/30 bg-amber-500/10",
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
              ) : null}
            </div>
            <Button
              size="icon-xs"
              variant="ghost"
              className="rounded-full"
              aria-label="Dismiss notification"
              onClick={() => toastManager.dismiss(toast.id)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toasts = useToastSnapshot();
  const value = useMemo(() => toasts, [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function AnchoredToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
