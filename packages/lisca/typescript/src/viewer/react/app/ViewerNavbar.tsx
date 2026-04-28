import {
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, FolderOpen, HardDrive, X } from "lucide-react";

import type { ViewerSource } from "lisca/shared/contracts";
import { Button, ToggleGroup, ToggleGroupItem } from "lisca/shared/ui";
import { ContextSummary } from "lisca/shared/react";

export type ViewerMode = "align" | "roi";

interface ViewerNavbarProps {
  workspacePath: string | null;
  source: ViewerSource | null;
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  modeChangeDisabled?: boolean;
  onPickWorkspace: () => Promise<void>;
  onOpenTif: () => Promise<void>;
  onOpenJpg: () => Promise<void>;
  onOpenNd2: () => Promise<void>;
  onOpenCzi: () => Promise<void>;
  onClearSource: () => void;
  onBatchCrop?: () => void;
  onLoadQ20Preset?: () => void;
  canBatchCrop?: boolean;
  canLoadQ20Preset?: boolean;
}

export default function ViewerNavbar({
  workspacePath,
  source,
  mode,
  onModeChange,
  modeChangeDisabled = false,
  onPickWorkspace,
  onOpenTif,
  onOpenJpg,
  onOpenNd2,
  onOpenCzi,
  onClearSource,
  onBatchCrop,
  onLoadQ20Preset,
  canBatchCrop = false,
  canLoadQ20Preset = false,
}: ViewerNavbarProps) {
  const [openDataModalOpen, setOpenDataModalOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openDataModalOpen && !toolsOpen) return undefined;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDataModalOpen(false);
        setToolsOpen(false);
        setPresetsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openDataModalOpen, toolsOpen]);

  useEffect(() => {
    if (!workspacePath) {
      setOpenDataModalOpen(false);
    }
  }, [workspacePath]);

  useEffect(() => {
    if (!toolsOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!toolsRef.current?.contains(event.target as Node)) {
        setToolsOpen(false);
        setPresetsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [toolsOpen]);

  const handleOpenTif = async () => {
    setOpenDataModalOpen(false);
    await onOpenTif();
  };

  const handleOpenNd2 = async () => {
    setOpenDataModalOpen(false);
    await onOpenNd2();
  };

  const handleOpenJpg = async () => {
    setOpenDataModalOpen(false);
    await onOpenJpg();
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
    : source?.kind === "jpg"
      ? "JPG"
    : source?.kind === "tif"
      ? "TIFF"
      : source?.kind === "czi"
        ? "CZI"
        : null;

  const handleBatchCrop = () => {
    setToolsOpen(false);
    setPresetsOpen(false);
    onBatchCrop?.();
  };

  const handleLoadQ20Preset = () => {
    setToolsOpen(false);
    setPresetsOpen(false);
    onLoadQ20Preset?.();
  };

  return (
    <>
      <header className="border-b border-border/80 bg-background px-6 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="min-w-0 justify-self-start">
            <ToggleGroup
              multiple={false}
              value={[mode]}
              disabled={modeChangeDisabled}
              onValueChange={(next) => {
                const nextMode = next[0];
                if (nextMode) onModeChange(nextMode);
              }}
            >
              <ToggleGroupItem value="align" className="min-w-[4.5rem]">
                Align
              </ToggleGroupItem>
              <ToggleGroupItem value="roi" className="min-w-[4.5rem]">
                ROI
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

          <div className="min-w-0 justify-self-end">
            <div ref={toolsRef} className="relative">
              <Button
                size="sm"
                variant={toolsOpen ? "default" : "outline"}
                className="min-w-[5.5rem]"
                disabled={modeChangeDisabled}
                onClick={() => {
                  setOpenDataModalOpen(false);
                  setToolsOpen((current) => {
                    const next = !current;
                    if (!next) {
                      setPresetsOpen(false);
                    }
                    return next;
                  });
                }}
              >
                Tools
              </Button>
              {toolsOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-56 rounded-2xl border border-border bg-card p-2 shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
                  style={{ backdropFilter: "none", opacity: 1 }}
                >
                  <button
                    type="button"
                    className="flex w-full items-start rounded-xl bg-card px-3 py-2 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-55"
                    disabled={!canBatchCrop}
                    onClick={handleBatchCrop}
                    style={{ backdropFilter: "none", opacity: 1 }}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">Batch Crop</p>
                      <p className="text-xs text-muted-foreground">
                        Crop all saved bbox CSVs
                      </p>
                    </div>
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl bg-card px-3 py-2 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-55"
                      disabled={!canLoadQ20Preset}
                      onClick={() => setPresetsOpen((current) => !current)}
                      style={{ backdropFilter: "none", opacity: 1 }}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">Load Preset</p>
                        <p className="text-xs text-muted-foreground">
                          Apply a hardcoded align preset
                        </p>
                      </div>
                      <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                    {presetsOpen ? (
                      <div
                        className="absolute right-[calc(100%+0.5rem)] top-0 z-50 w-52 rounded-2xl border border-border bg-card p-2 shadow-[0_20px_40px_rgba(0,0,0,0.24)]"
                        style={{ backdropFilter: "none", opacity: 1 }}
                      >
                      <button
                        type="button"
                        className="flex w-full items-start rounded-xl bg-card px-3 py-2 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-55"
                        disabled={!canLoadQ20Preset}
                        onClick={handleLoadQ20Preset}
                        style={{ backdropFilter: "none", opacity: 1 }}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">Q20</p>
                          <p className="text-xs text-muted-foreground">
                            Square, 168 pitch, 128 cell size
                          </p>
                        </div>
                      </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
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
              <div className="grid grid-cols-4 gap-3">
                <button
                  type="button"
                  className="group flex min-h-24 w-full items-center justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-4 py-5 text-center transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void handleOpenTif()}
                >
                  <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                    TIFF
                  </p>
                </button>

                <button
                  type="button"
                  className="group flex min-h-24 w-full items-center justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-4 py-5 text-center transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void handleOpenJpg()}
                >
                  <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                    PNG
                  </p>
                </button>

                <button
                  type="button"
                  className="group flex min-h-24 w-full items-center justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-4 py-5 text-center transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void handleOpenNd2()}
                >
                  <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                    ND2
                  </p>
                </button>

                <button
                  type="button"
                  className="group flex min-h-24 w-full items-center justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-4 py-5 text-center transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void handleOpenCzi()}
                >
                  <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
                    CZI
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
