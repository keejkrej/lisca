import type { StudioHostPort } from "@lisca/contracts";
import { AppShell } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { studioClient } from "../api/studio-client";
import { BasicInfoStep1 } from "../components/basic-info-step1";
import { BasicInfoStep2 } from "../components/basic-info-step2";
import { BasicInfoStep3 } from "../components/basic-info-step3";
import { DockButton } from "../components/dock-button";
import { StudioDock } from "../components/studio-dock";
import { StudioLeft } from "../components/studio-left";
import { instructionForStep, validInfo1, validInfo2, validInfo3 } from "../state/studio-routes";
import { buildStudioAssayJson, useStudioStore } from "../state/studio-store";

export const Route = createFileRoute("/info")({
  component: InfoPage,
});

function InfoPage() {
  const navigate = useNavigate();
  const hostPort = useMemo<StudioHostPort>(() => studioClient, []);
  const assayId = useStudioStore((state) => state.assayId);
  const infoStep = useStudioStore((state) => state.infoStep);
  const setInfoStep = useStudioStore((state) => state.setInfoStep);
  const dataSourceKind = useStudioStore((state) => state.dataSourceKind);
  const info1 = useStudioStore((state) => state.info1);
  const info2 = useStudioStore((state) => state.info2);
  const info3 = useStudioStore((state) => state.info3);
  const [savingAssay, setSavingAssay] = useState(false);
  const canContinue =
    infoStep === 1 ? validInfo1(info1) : infoStep === 2 ? validInfo2(info2) : validInfo3(info3);
  const step = infoStep === 1 ? "info1" : infoStep === 2 ? "info2" : "info3";

  const saveAssayAndGoAlign = async () => {
    if (!assayId || savingAssay) return;
    setSavingAssay(true);
    try {
      const assayJson = buildStudioAssayJson({ assayId, dataSourceKind, info1, info2, info3 });
      await hostPort.saveAssayJson(info1.saveTo.trim(), JSON.stringify(assayJson, null, 2));
      await navigate({ to: "/align" });
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSavingAssay(false);
    }
  };

  const next = async () => {
    if (infoStep < 3) {
      setInfoStep((infoStep + 1) as 1 | 2 | 3);
      return;
    }
    await saveAssayAndGoAlign();
  };

  const back = () => {
    if (savingAssay) return;
    if (infoStep > 1) {
      setInfoStep((infoStep - 1) as 1 | 2 | 3);
    }
  };

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <div className="mx-auto flex min-h-full w-full min-w-0 max-w-[52rem] flex-col items-center justify-center px-4 py-6 md:px-[100px] md:py-10">
              {infoStep === 1 ? <BasicInfoStep1 hostPort={hostPort} /> : null}
              {infoStep === 2 ? <BasicInfoStep2 /> : null}
              {infoStep === 3 ? <BasicInfoStep3 /> : null}
            </div>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction={instructionForStep(step)}
              action={
                <div className="flex w-full flex-col gap-2">
                  <DockButton disabled={infoStep === 1 || savingAssay} onClick={back}>
                    back
                  </DockButton>
                  <DockButton
                    disabled={!canContinue || savingAssay}
                    loading={savingAssay}
                    onClick={() => void next()}
                  >
                    {infoStep === 3 ? "save" : "next"}
                  </DockButton>
                </div>
              }
              tools={null}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}
