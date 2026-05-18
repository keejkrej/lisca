"use client";

import { X } from "lucide-react";

import { Button } from "../components/ui/button";

export type SourcePickerModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenFolder: () => void | Promise<void>;
  onOpenNd2: () => void | Promise<void>;
  onOpenCzi: () => void | Promise<void>;
};

export function SourcePickerModal({
  open,
  onClose,
  onOpenFolder,
  onOpenNd2,
  onOpenCzi,
}: SourcePickerModalProps) {
  if (!open) return null;

  const handleSelect = async (fn: () => void | Promise<void>) => {
    onClose();
    await fn();
  };

  const optionClass =
    "group flex min-h-24 w-full items-center justify-center rounded-lg border border-border bg-muted/20 px-4 py-5 text-center transition-colors hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby="open-source-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
        role="dialog"
      >
        <div className="px-5 pb-3 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-semibold text-foreground text-lg" id="open-source-title">
                Open Data
              </h2>
              <p className="text-muted-foreground text-sm">Choose a source format.</p>
            </div>

            <Button
              aria-label="Close open data modal"
              className="shrink-0"
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              className={optionClass}
              type="button"
              onClick={() => void handleSelect(onOpenFolder)}
            >
              <span className="font-medium text-foreground text-lg group-hover:text-primary">
                Folder
              </span>
            </button>
            <button
              className={optionClass}
              type="button"
              onClick={() => void handleSelect(onOpenNd2)}
            >
              <span className="font-medium text-foreground text-lg group-hover:text-primary">
                ND2
              </span>
            </button>
            <button
              className={optionClass}
              type="button"
              onClick={() => void handleSelect(onOpenCzi)}
            >
              <span className="font-medium text-foreground text-lg group-hover:text-primary">
                CZI
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
