import { useMemo } from "react";
import { createTauriDesktopPorts } from "lisca/shared/host-tauri";

import { Field, FieldLabel, Input } from "lisca/shared/ui";
import { basicInfoAssayTitle, useStudioStore } from "../studioStore";

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

export function BasicInfoStep1() {
  const assayId = useStudioStore((s) => s.assayId);
  const info1 = useStudioStore((s) => s.info1);
  const setInfo1 = useStudioStore((s) => s.setInfo1);
  const pickFolder = useFolderPicker();

  const triggerFolderPick = async (key: "dataPath" | "saveTo") => {
    const path = await pickFolder();
    if (path) setInfo1({ [key]: path });
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-[30px]">
      <h1 className="text-center font-normal text-4xl leading-tight text-foreground">
        {basicInfoAssayTitle(assayId)}
      </h1>

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
              placeholder="mRNA lifetime test"
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
                  ? `Data path ${info1.dataPath}, click to change folder`
                  : "Data path, click to choose folder"
              }
              autoComplete="off"
              className="w-full cursor-pointer [&_input]:cursor-pointer"
              placeholder="Click to choose folder…"
              value={info1.dataPath}
              onClick={() => void triggerFolderPick("dataPath")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void triggerFolderPick("dataPath");
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
              onClick={() => void triggerFolderPick("saveTo")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void triggerFolderPick("saveTo");
                }
              }}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
