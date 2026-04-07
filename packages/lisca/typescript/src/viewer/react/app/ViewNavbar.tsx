import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { FolderOpen, HardDrive, X } from "lucide-react";

import type { ViewerSource } from "lisca/viewer/contracts";
import { Button } from "lisca/viewer/ui";

export type ViewerMode = "align" | "roi";

interface ViewNavbarProps {
  workspacePath: string | null;
  source: ViewerSource | null;
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  onPickWorkspace: () => Promise<void>;
  onOpenTif: () => Promise<void>;
  onOpenNd2: () => Promise<void>;
  onOpenCzi: () => Promise<void>;
  onClearSource: () => void;
}

function pathBaseName(path: string | null) {
  if (!path) return null;
  const segments = path.split(/[\\/]/).filter(Boolean);
  return segments.at(-1) ?? path;
}

function ContextSummary({
  label,
  value,
  icon,
  badge,
  onClick,
  disabled = false,
  action,
}: {
  label: string;
  value: string | null;
  icon: ReactNode;
  badge?: string | null;
  onClick?: () => void;
  disabled?: boolean;
  action?: ReactNode;
}) {
  const baseName = pathBaseName(value);
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled || !onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onClick?.();
      }}
      onKeyDown={handleKeyDown}
      className={[
        "min-w-0 max-w-[22rem] rounded-xl border border-border/55 bg-muted/15 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled
          ? "cursor-default opacity-65"
          : "cursor-pointer hover:border-border/80 hover:bg-muted/25",
      ].join(" ")}
      title={value ?? `${label} not selected`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="shrink-0 text-muted-foreground/70">
          {icon}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
            {label}
          </span>
          <p className="truncate text-sm text-foreground/90">
            {baseName ?? "Not selected"}
          </p>
          {badge ? (
            <span className="shrink-0 rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export default function ViewNavbar({
  workspacePath,
  source,
  mode,
  onModeChange,
  onPickWorkspace,
  onOpenTif,
  onOpenNd2,
  onOpenCzi,
  onClearSource,
}: ViewNavbarProps) {
  const [openDataModalOpen, setOpenDataModalOpen] = useState(false);

  useEffect(() => {
    if (!openDataModalOpen) return undefined;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDataModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openDataModalOpen]);

  useEffect(() => {
    if (!workspacePath) {
      setOpenDataModalOpen(false);
    }
  }, [workspacePath]);

  const handleOpenTif = async () => {
    setOpenDataModalOpen(false);
    await onOpenTif();
  };

  const handleOpenNd2 = async () => {
    setOpenDataModalOpen(false);
    await onOpenNd2();
  };

  const handleOpenCzi = async () => {
    setOpenDataModalOpen(false);
    await onOpenCzi();
  };

  const handleSourceClear = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClearSource();
  };

  const sourceBadge = source?.kind === "nd2"
    ? "ND2"
    : source?.kind === "tif"
      ? "TIFF"
      : source?.kind === "czi"
        ? "CZI"
        : null;

  return (
    <>
      <header className="border-b border-border/80 bg-background/95 px-6 py-3 backdrop-blur">
        <div className="grid grid-cols-[1fr_minmax(0,56rem)_1fr] items-center gap-4">
          <div />

          <div className="min-w-0">
            <div className="flex items-center justify-center gap-3">
              <ContextSummary
                label="Workspace"
                value={workspacePath}
                icon={<FolderOpen className="size-4" />}
                onClick={() => void onPickWorkspace()}
              />
              <ContextSummary
                label="Source"
                value={source?.path ?? null}
                icon={<HardDrive className="size-4" />}
                badge={sourceBadge}
                disabled={!workspacePath}
                onClick={() => setOpenDataModalOpen(true)}
                action={
                  source ? (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="rounded-full"
                      aria-label="Clear source"
                      onClick={handleSourceClear}
                    >
                      <X className="size-3.5" />
                    </Button>
                  ) : null
                }
              />
            </div>
          </div>

          <div className="justify-self-end">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/35 p-1">
              <Button
                size="sm"
                variant={mode === "align" ? "default" : "ghost"}
                className="min-w-[4.5rem]"
                onClick={() => onModeChange("align")}
              >
                Align
              </Button>
              <Button
                size="sm"
                variant={mode === "roi" ? "default" : "ghost"}
                className="min-w-[4.5rem]"
                onClick={() => onModeChange("roi")}
              >
                ROI
              </Button>
            </div>
          </div>
        </div>
      </header>

      {openDataModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpenDataModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-[1.25rem] border border-border/80 bg-card shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="open-data-title"
          >
            <div className="px-5 pb-3 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 id="open-data-title" className="text-[1.4rem] font-medium tracking-tight text-foreground">
                    Open Data
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Choose a source format.
                  </p>
                </div>

                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0 rounded-full"
                  aria-label="Close open data modal"
                  onClick={() => setOpenDataModalOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  className="group flex min-h-36 w-full flex-col items-start justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-5 py-5 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void handleOpenTif()}
                >
                  <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                    TIFF
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Folder with Pos{"{n}"} stacks
                  </p>
                </button>

                <button
                  type="button"
                  className="group flex min-h-36 w-full flex-col items-start justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-5 py-5 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void handleOpenNd2()}
                >
                  <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                    ND2
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Nikon acquisition file
                  </p>
                </button>

                <button
                  type="button"
                  className="group flex min-h-36 w-full flex-col items-start justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-5 py-5 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void handleOpenCzi()}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                      CZI
                    </p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Zeiss acquisition file
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
