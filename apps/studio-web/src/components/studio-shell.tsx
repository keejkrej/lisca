import type { StudioHostPort } from "@lisca/contracts";
import { HostFilePickerDialog, ShellThemeToggle } from "@lisca/ui";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { studioClient } from "../api/studio-client";
import {
  StudioAlignBottomPanel,
  StudioAlignLeftPanel,
  StudioAlignMainPanel,
  StudioAlignRightPanel,
  useStudioAlignState,
} from "./studio-align";
import { CommandButton, StudioCommandBar } from "./studio-command-bar";
import { StudioNavRail } from "./studio-nav-rail";
import { BasicInfoStep1 } from "../screens/basic-info-step1";
import { BasicInfoStep2 } from "../screens/basic-info-step2";
import { BasicInfoStep3 } from "../screens/basic-info-step3";
import { WelcomeAssay } from "../screens/welcome-assay";
import { instructionForStep, validInfo1, validInfo2, validInfo3 } from "../state/studio-routes";
import {
  buildStudioAssayJson,
  parseStudioAssayJson,
  useStudioStore,
  type StudioStep,
} from "../state/studio-store";

type RouteId = "assay" | "info" | "align" | "inspect" | "result";

function routeToStep(routeId: RouteId, infoStep: 1 | 2 | 3): StudioStep {
  if (routeId === "assay") return "welcome";
  if (routeId === "align") return "alignPattern";
  if (infoStep === 1) return "info1";
  if (infoStep === 2) return "info2";
  return "info3";
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center p-8 text-center">
      <h1 className="font-semibold text-2xl">{title}</h1>
      <p className="mt-2 max-w-md text-muted-foreground text-sm">
        This Studio route is reserved for the next porting pass.
      </p>
    </div>
  );
}

export function StudioShell({ routeId }: { routeId: RouteId }) {
  const navigate = useNavigate();
  const hostPort = useMemo<StudioHostPort>(() => studioClient, []);
  const alignState = useStudioAlignState();
  const assayId = useStudioStore((state) => state.assayId);
  const infoStep = useStudioStore((state) => state.infoStep);
  const setInfoStep = useStudioStore((state) => state.setInfoStep);
  const dataSourceKind = useStudioStore((state) => state.dataSourceKind);
  const info1 = useStudioStore((state) => state.info1);
  const info2 = useStudioStore((state) => state.info2);
  const info3 = useStudioStore((state) => state.info3);
  const loadAssayJson = useStudioStore((state) => state.loadAssayJson);
  const [savingAssay, setSavingAssay] = useState(false);
  const [openingAssay, setOpeningAssay] = useState(false);
  const [assayPickerOpen, setAssayPickerOpen] = useState(false);
  const step = routeToStep(routeId, infoStep);

  const canContinue =
    routeId === "assay"
      ? Boolean(assayId)
      : routeId === "info" && infoStep === 1
        ? validInfo1(info1)
        : routeId === "info" && infoStep === 2
          ? validInfo2(info2)
          : routeId === "info" && infoStep === 3
            ? validInfo3(info3)
            : false;

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

  const nextAction = async () => {
    if (routeId === "assay") {
      await navigate({ to: "/info" });
      setInfoStep(1);
      return;
    }
    if (routeId === "info" && infoStep < 3) {
      setInfoStep((infoStep + 1) as 1 | 2 | 3);
      return;
    }
    if (routeId === "info") {
      await saveAssayAndGoAlign();
      return;
    }
    if (routeId === "align") {
      await alignState.saveAndAdvance();
    }
  };

  const completeAssayOpen = async (path: string) => {
    setAssayPickerOpen(false);
    setOpeningAssay(true);
    try {
      const contents = await hostPort.readTextFile(path);
      loadAssayJson(parseStudioAssayJson(contents));
      await navigate({ to: "/info" });
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setOpeningAssay(false);
    }
  };

  const stepAction =
    routeId === "align" ? (
      <CommandButton
        disabled={!alignState.frame || alignState.saving}
        loading={alignState.saving}
        onClick={() => void nextAction()}
      >
        next
      </CommandButton>
    ) : routeId === "inspect" || routeId === "result" ? null : (
      <CommandButton
        disabled={!canContinue || savingAssay}
        loading={savingAssay}
        onClick={() => void nextAction()}
      >
        {routeId === "info" && infoStep === 3 ? "save" : "next"}
      </CommandButton>
    );

  const commandTool =
    routeId === "assay" ? (
      <CommandButton
        disabled={openingAssay}
        loading={openingAssay}
        onClick={() => setAssayPickerOpen(true)}
      >
        open assay
      </CommandButton>
    ) : null;

  return (
    <div className="grid h-svh min-h-0 w-full grid-cols-1 overflow-hidden bg-background text-foreground md:grid-cols-[240px_minmax(0,1fr)_240px]">
      <StudioNavRail routeId={routeId} infoStep={infoStep} onInfoStepChange={setInfoStep} />
      <div className="flex min-h-0 min-w-0 flex-col border-border/60 md:border-x">
        <div className="flex h-12 shrink-0 items-center justify-end border-b border-border/60 px-3 md:hidden">
          <ShellThemeToggle />
        </div>
        {routeId === "align" ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[18rem_minmax(0,1fr)_18rem]">
            <aside className="hidden min-h-0 border-r border-border/60 lg:block">
              <StudioAlignLeftPanel state={alignState} />
            </aside>
            <main className="min-h-0 min-w-0">
              <StudioAlignMainPanel state={alignState} />
            </main>
            <aside className="hidden min-h-0 border-l border-border/60 lg:block">
              <StudioAlignRightPanel state={alignState} />
            </aside>
          </div>
        ) : (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full min-w-0 max-w-[52rem] flex-col items-center justify-center px-4 py-6 md:px-[100px] md:py-10">
              {routeId === "assay" ? <WelcomeAssay /> : null}
              {routeId === "info" && infoStep === 1 ? <BasicInfoStep1 hostPort={hostPort} /> : null}
              {routeId === "info" && infoStep === 2 ? <BasicInfoStep2 /> : null}
              {routeId === "info" && infoStep === 3 ? <BasicInfoStep3 /> : null}
              {routeId === "inspect" ? <Placeholder title="Inspect ROI" /> : null}
              {routeId === "result" ? <Placeholder title="Results" /> : null}
            </div>
          </main>
        )}
        <StudioCommandBar
          instruction={instructionForStep(step)}
          step={stepAction}
          tool={routeId === "align" ? <StudioAlignBottomPanel state={alignState} /> : commandTool}
        />
      </div>
      <aside className="hidden min-h-0 w-60 min-w-60 shrink-0 border-l border-border/80 bg-card/20 md:block">
        <div className="flex justify-end p-3">
          <ShellThemeToggle />
        </div>
      </aside>
      <HostFilePickerDialog
        description="Choose a JSON file from a prior Studio export."
        hostPort={hostPort}
        mode="assay_json_file"
        open={assayPickerOpen}
        title="Open assay.json"
        onOpenChange={setAssayPickerOpen}
        onPickDirectory={() => {}}
        onPickFile={(path) => void completeAssayOpen(path)}
      />
    </div>
  );
}
