import { useEffect, useMemo, useState } from "react";
import { createTauriDesktopPorts } from "lisca/shared/host-tauri";

import { Button, Field, FieldLabel, Input } from "lisca/shared/ui";
import { X } from "lucide-react";
import { useStudioStore } from "../studioStore";

const ROW = "flex min-h-[100px] w-full flex-col gap-2.5 p-2.5";

function useFolderPicker() {
  const isTauri = useMemo(
    () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window,
    [],
  );

  return useMemo(() => {
    return async (): Promise<string | null> => {
      if (isTauri) {
        const path = await createTauriDesktopPorts().hostPort.pickWorkspace();
        return path ?? null;
      }
      return null;
    };
  }, [isTauri]);
}

function useDataSourcePicker() {
  const isTauri = useMemo(
    () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window,
    [],
  );

  return useMemo(() => {
    return {
      async pickTiff(): Promise<string | null> {
        if (!isTauri) return null;
        return (await createTauriDesktopPorts().hostPort.pickTifDirectory()) ?? null;
      },
      async pickPng(): Promise<string | null> {
        if (!isTauri) return null;
        return (await createTauriDesktopPorts().hostPort.pickJpgDirectory()) ?? null;
      },
      async pickNd2(): Promise<string | null> {
        if (!isTauri) return null;
        return (await createTauriDesktopPorts().hostPort.pickNd2File()) ?? null;
      },
      async pickCzi(): Promise<string | null> {
        if (!isTauri) return null;
        return (await createTauriDesktopPorts().hostPort.pickCziFile()) ?? null;
      },
    };
  }, [isTauri]);
}

function SourceOption({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="group flex min-h-24 w-full items-center justify-center rounded-2xl border border-border/70 bg-muted/[0.12] px-4 py-5 text-center transition-colors hover:border-primary/35 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
    >
      <p className="text-[1.1rem] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
        {label}
      </p>
    </button>
  );
}

export function BasicInfoStep1() {
  const info1 = useStudioStore((s) => s.info1);
  const setInfo1 = useStudioStore((s) => s.setInfo1);
  const pickFolder = useFolderPicker();
  const dataSourcePicker = useDataSourcePicker();
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

  const triggerSaveFolderPick = async () => {
    const path = await pickFolder();
    if (path) setInfo1({ saveTo: path });
  };

  const triggerDataSourcePick = async (
    pick: () => Promise<string | null>,
  ) => {
    setOpenDataModalOpen(false);
    const path = await pick();
    if (path) setInfo1({ dataPath: path });
  };

  return (
    <>
      <div className="flex w-full min-w-0 flex-col gap-2.5">
        <div className={ROW}>
          <Field className="gap-2.5" name="name">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-name">
              Name
            </FieldLabel>
            <Input
              id="studio-name"
              autoComplete="off"
              className="w-full"
              value={info1.name}
              onChange={(e) => setInfo1({ name: e.target.value })}
              placeholder="My assay"
            />
          </Field>
        </div>

        <div className={ROW}>
          <Field className="gap-2.5" name="date">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-date">
              Date
            </FieldLabel>
            <Input
              id="studio-date"
              className="w-full"
              type="date"
              value={info1.date}
              onChange={(e) => setInfo1({ date: e.target.value })}
            />
          </Field>
        </div>

        <div className={ROW}>
          <Field className="gap-2.5" name="dataPath">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-data-path">
              Data path
            </FieldLabel>
            <Input
              id="studio-data-path"
              readOnly
              aria-label={
                info1.dataPath.trim()
                  ? `Data path ${info1.dataPath}, click to change source`
                  : "Data path, click to choose source"
              }
              autoComplete="off"
              className="w-full cursor-pointer [&_input]:cursor-pointer"
              placeholder="Click to choose source..."
              value={info1.dataPath}
              onClick={() => setOpenDataModalOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenDataModalOpen(true);
                }
              }}
            />
          </Field>
        </div>

        <div className={ROW}>
          <Field className="gap-2.5" name="saveTo">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-save-to">
              Save to
            </FieldLabel>
            <Input
              id="studio-save-to"
              readOnly
              aria-label={
                info1.saveTo.trim()
                  ? `Save to ${info1.saveTo}, click to change folder`
                  : "Save to, click to choose folder"
              }
              autoComplete="off"
              className="w-full cursor-pointer [&_input]:cursor-pointer"
              placeholder="Click to choose folder…"
              value={info1.saveTo}
              onClick={() => void triggerSaveFolderPick()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void triggerSaveFolderPick();
                }
              }}
            />
          </Field>
        </div>

      </div>

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
            aria-labelledby="studio-open-data-title"
          >
            <div className="px-5 pb-3 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2
                    id="studio-open-data-title"
                    className="text-[1.4rem] font-medium tracking-tight text-foreground"
                  >
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
                <SourceOption
                  label="TIFF"
                  onClick={() => void triggerDataSourcePick(dataSourcePicker.pickTiff)}
                />
                <SourceOption
                  label="PNG"
                  onClick={() => void triggerDataSourcePick(dataSourcePicker.pickPng)}
                />
                <SourceOption
                  label="ND2"
                  onClick={() => void triggerDataSourcePick(dataSourcePicker.pickNd2)}
                />
                <SourceOption
                  label="CZI"
                  onClick={() => void triggerDataSourcePick(dataSourcePicker.pickCzi)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
