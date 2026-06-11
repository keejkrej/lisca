"use client";

import type { AlignerSource } from "@lisca/contracts";
import { X } from "lucide-react";

import { Button } from "../../components/ui/button";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";

export type SourcePickerRecentItem = {
  source: AlignerSource;
  label?: string;
};

function formatSourcePath(source: AlignerSource): string {
  return source.path;
}

export type SourcePickerModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenFolder: () => void | Promise<void>;
  onOpenNd2: () => void | Promise<void>;
  onOpenCzi: () => void | Promise<void>;
  recentSources?: readonly SourcePickerRecentItem[];
  onPickRecentSource?: (source: AlignerSource) => void;
};

export function SourcePickerModal({
  open,
  onClose,
  onOpenFolder,
  onOpenNd2,
  onOpenCzi,
  recentSources,
  onPickRecentSource,
}: SourcePickerModalProps) {
  if (!open) return null;

  const handleSelect = async (fn: () => void | Promise<void>) => {
    onClose();
    await fn();
  };

  const optionClass =
    "group flex min-h-24 w-full items-center justify-center rounded-lg border border-border bg-muted/20 px-4 py-5 text-center transition-colors hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <ModalScrim
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <DialogSurface aria-labelledby="open-source-title" maxWidth="lg">
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

        <div className="space-y-4 px-5 pb-5">
          {recentSources && recentSources.length > 0 && onPickRecentSource ? (
            <div className="space-y-2">
              <p className="font-medium text-foreground text-sm">Recent sources</p>
              <ul className="max-h-32 overflow-auto rounded-md border border-border divide-y divide-border/60">
                {recentSources.map((item) => (
                  <li key={`${item.source.kind}:${item.source.path}`}>
                    <button
                      className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/30"
                      type="button"
                      onClick={() => {
                        onPickRecentSource(item.source);
                        onClose();
                      }}
                    >
                      {item.label ? (
                        <span className="font-medium text-foreground">{item.label}</span>
                      ) : (
                        <span className="font-medium text-foreground capitalize">
                          {item.source.kind}
                        </span>
                      )}
                      <span
                        className="truncate text-muted-foreground"
                        title={formatSourcePath(item.source)}
                      >
                        {formatSourcePath(item.source)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
      </DialogSurface>
    </ModalScrim>
  );
}
