import { type MouseEvent, useEffect, useState } from "react";
import { FolderOpen, HardDrive, X } from "lucide-react";

import type { AnnotationMode, ViewerSource } from "lisca/shared/contracts";
import { ContextSummary } from "lisca/shared/react";
import { Button, ToggleGroup, ToggleGroupItem } from "lisca/shared/ui";

export type AnnotatorDataMode = "roi" | "raw";

interface AnnotatorNavbarProps {
  workspacePath: string | null;
  source: ViewerSource | null;
  dataMode: AnnotatorDataMode;
  annotationMode: AnnotationMode;
  sourceDisabled?: boolean;
  onDataModeChange: (mode: AnnotatorDataMode) => void;
  onAnnotationModeChange: (mode: AnnotationMode) => void;
  onPickWorkspace: () => Promise<void>;
  onOpenTif: () => Promise<void>;
  onOpenJpg: () => Promise<void>;
  onOpenNd2: () => Promise<void>;
  onOpenCzi: () => Promise<void>;
  onClearSource: () => void;
}

export default function AnnotatorNavbar({
  workspacePath,
  source,
  dataMode,
  annotationMode,
  sourceDisabled = false,
  onDataModeChange,
  onAnnotationModeChange,
  onPickWorkspace,
  onOpenTif,
  onOpenJpg,
  onOpenNd2,
  onOpenCzi,
  onClearSource,
}: AnnotatorNavbarProps) {
  const [openDataModalOpen, setOpenDataModalOpen] = useState(false);

  useEffect(() => {
    if (!openDataModalOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
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

  const sourceBadge =
    source?.kind === "nd2"
      ? "ND2"
      : source?.kind === "jpg"
        ? "JPG"
        : source?.kind === "tif"
          ? "TIFF"
          : source?.kind === "czi"
            ? "CZI"
            : null;

  const handleSourceClear = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClearSource();
  };

  const openSourcePicker = () => {
    if (sourceDisabled || !workspacePath) return;
    setOpenDataModalOpen(true);
  };

  const openAndClose = async (fn: () => Promise<void>) => {
    setOpenDataModalOpen(false);
    await fn();
  };

  return (
    <>
      <header className="shrink-0 border-b border-border/80 bg-background px-6 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="min-w-0 justify-self-start">
            <ToggleGroup
              multiple={false}
              value={[dataMode]}
              onValueChange={(value) => {
                const nextMode = value[0];
                if (nextMode === "roi" || nextMode === "raw") onDataModeChange(nextMode);
              }}
            >
              <ToggleGroupItem value="roi" className="min-w-[4.5rem]">
                ROI
              </ToggleGroupItem>
              <ToggleGroupItem value="raw" className="min-w-[4.5rem]">
                Raw
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="min-w-0 justify-self-center">
            <div className="flex max-w-[56rem] flex-wrap items-center justify-center gap-3">
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
                disabled={sourceDisabled || !workspacePath}
                onClick={openSourcePicker}
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

          <div className="min-w-0 justify-self-end">
            <ToggleGroup
              className="w-fit max-w-full"
              multiple={false}
              value={[annotationMode]}
              onValueChange={(value) => {
                const nextMode = value[0];
                if (nextMode === "classification" || nextMode === "semantic" || nextMode === "instance") {
                  onAnnotationModeChange(nextMode);
                }
              }}
            >
              <ToggleGroupItem className="min-w-[4.25rem] px-2" value="classification">
                Class
              </ToggleGroupItem>
              <ToggleGroupItem className="min-w-[4.25rem] px-2" value="semantic">
                Regions
              </ToggleGroupItem>
              <ToggleGroupItem className="min-w-[4.25rem] px-2" value="instance">
                Objects
              </ToggleGroupItem>
            </ToggleGroup>
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
                    Open Source
                  </h2>
                  <p className="text-sm text-muted-foreground">Choose a source format.</p>
                </div>

                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0 rounded-full"
                  aria-label="Close open source modal"
                  onClick={() => setOpenDataModalOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 px-5 pb-5">
              <button
                type="button"
                className="group flex min-h-36 w-full flex-col items-start justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-5 py-5 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void openAndClose(onOpenTif)}
              >
                <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                  TIFF
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Folder with Pos{"{n}"} stacks</p>
              </button>

              <button
                type="button"
                className="group flex min-h-36 w-full flex-col items-start justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-5 py-5 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void openAndClose(onOpenJpg)}
              >
                <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                  JPG
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Folder with Pos{"{n}"} image frames</p>
              </button>

              <button
                type="button"
                className="group flex min-h-36 w-full flex-col items-start justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-5 py-5 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void openAndClose(onOpenNd2)}
              >
                <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                  ND2
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Nikon acquisition file</p>
              </button>

              <button
                type="button"
                className="group flex min-h-36 w-full flex-col items-start justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-5 py-5 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void openAndClose(onOpenCzi)}
              >
                <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                  CZI
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Zeiss acquisition file</p>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
