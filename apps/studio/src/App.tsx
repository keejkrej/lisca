import { Button } from "lisca/shared/ui";
import type { ViewerDataPort } from "lisca/shared/contracts";
import { createTauriDesktopPorts } from "lisca/shared/host-tauri";
import {
  createAlignStore,
  showErrorToast,
  showSuccessToast,
  type AlignPatternStatus,
  type AlignPatternToolMode,
} from "lisca/shared/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AlignPatternCommandToolbar } from "./components/studio/AlignPatternCommandToolbar";
import { StudioCommandBar } from "./components/studio/StudioCommandBar";
import { StudioNavRail } from "./components/studio/StudioNavRail";
import { StudioAlignPattern } from "./screens/StudioAlignPattern";
import { BasicInfoStep1 } from "./screens/BasicInfoStep1";
import { BasicInfoStep2 } from "./screens/BasicInfoStep2";
import { BasicInfoStep3 } from "./screens/BasicInfoStep3";
import { WelcomeAssay } from "./screens/WelcomeAssay";
import { instructionForStep } from "./studioCopy";
import {
  buildStudioAssayJson,
  parseStudioAssayJson,
  type StudioStep,
  useStudioStore,
} from "./studioStore";
import { nextStudioStep, validInfo1, validInfo2, validInfo3 } from "./studioRoutes";

/** `variant="ghost"`; white label on the command bar. `!` + `sm:!` override Button defaults (`sm:text-sm`, `sm:h-8`). */
const stepGhostCtaClass =
  "!h-auto !min-h-0 py-1.5 sm:!h-auto sm:py-1.5 !text-xl sm:!text-xl font-normal leading-tight text-white shadow-none hover:bg-white/10 hover:text-white data-[pressed]:text-white data-[pressed]:bg-white/10 disabled:text-white/50";

interface StudioAppProps {
  step: StudioStep;
  dataPort: ViewerDataPort | null;
  onStepChange: (step: StudioStep) => void;
}

export default function StudioApp({ step, dataPort, onStepChange }: StudioAppProps) {
  const assayId = useStudioStore((s) => s.assayId);
  const info1 = useStudioStore((s) => s.info1);
  const info2 = useStudioStore((s) => s.info2);
  const info3 = useStudioStore((s) => s.info3);
  const loadAssayJson = useStudioStore((s) => s.loadAssayJson);
  const alignStore = useMemo(() => createAlignStore(), []);
  const hostPort = useMemo(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      return createTauriDesktopPorts().hostPort;
    }
    return null;
  }, []);

  const [alignToolMode, setAlignToolMode] = useState<AlignPatternToolMode>("pan");
  const [savingAssay, setSavingAssay] = useState(false);
  const [openingAssay, setOpeningAssay] = useState(false);

  const alignCommitRef = useRef<(() => Promise<void>) | null>(null);
  const [alignStatus, setAlignStatus] = useState<AlignPatternStatus>({
    ready: false,
    loading: false,
    saving: false,
    error: null,
  });

  const alignNextDisabled = step === "alignPattern" ? !alignStatus.ready : false;

  useEffect(() => {
    if (step !== "alignPattern") {
      setAlignToolMode("pan");
    }
  }, [step]);

  const canContinue =
    step === "welcome"
      ? Boolean(assayId)
      : step === "info1"
        ? validInfo1(info1)
        : step === "info2"
          ? validInfo2(info2)
          : step === "info3"
            ? validInfo3(info3)
            : false;
  const nextStep = nextStudioStep({ step, assayId, info1, info2, info3 });

  const handleBasicInfoNext = async () => {
    if (!nextStep || savingAssay) return;

    if (step !== "info3") {
      onStepChange(nextStep);
      return;
    }

    if (!assayId) return;
    if (!hostPort) {
      showErrorToast("Cannot save assay.json outside the desktop app.");
      return;
    }

    setSavingAssay(true);
    try {
      const assayJson = buildStudioAssayJson({ assayId, info1, info2, info3 });
      await hostPort.saveAssayJson(info1.saveTo.trim(), JSON.stringify(assayJson, null, 2));
      onStepChange(nextStep);
    } catch (cause) {
      showErrorToast(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSavingAssay(false);
    }
  };

  const handleOpenAssay = async () => {
    if (openingAssay) return;
    if (!hostPort) {
      showErrorToast("Cannot open assay.json outside the desktop app.");
      return;
    }

    setOpeningAssay(true);
    try {
      const contents = await hostPort.openAssayJson();
      if (!contents) return;

      const assayJson = parseStudioAssayJson(contents);
      loadAssayJson(assayJson);
      showSuccessToast("Loaded assay.json");
      onStepChange("info1");
    } catch (cause) {
      showErrorToast(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setOpeningAssay(false);
    }
  };

  const stepAction =
    step === "alignPattern" ? (
      <Button
        className={stepGhostCtaClass}
        disabled={alignNextDisabled}
        type="button"
        variant="ghost"
        onClick={() => {
          void alignCommitRef.current?.();
        }}
      >
        next
      </Button>
    ) : (
      <Button
        className={stepGhostCtaClass}
        disabled={!canContinue || savingAssay}
        type="button"
        variant="ghost"
        onClick={() => {
          void handleBasicInfoNext();
        }}
      >
        {savingAssay ? "saving..." : step === "info3" ? "save" : "next"}
      </Button>
    );

  const isBasicInfoMain = step === "info1" || step === "info2" || step === "info3";

  const mainInnerClass = isBasicInfoMain
    ? "mx-auto flex min-h-full w-full min-w-0 max-w-[52rem] flex-col items-center justify-center px-4 py-6 md:px-[100px] md:py-10"
    : step === "alignPattern"
      ? "flex min-h-0 min-w-0 w-full max-w-none flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8"
      : `mx-auto flex w-full min-h-0 min-w-0 max-w-[52rem] flex-1 flex-col items-center px-4 py-6 sm:px-6 sm:py-8 ${
          step === "welcome" ? "justify-center" : "justify-start"
        }`;

  const mainScrollClass =
    step === "alignPattern" ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto";

  return (
    <div className="grid h-svh min-h-0 w-full grid-cols-1 overflow-hidden bg-background text-foreground md:grid-cols-[240px_minmax(0,1fr)_240px]">
      <StudioNavRail
        alignStore={alignStore}
        step={step}
        className="hidden min-h-0 md:flex"
        onStepChange={onStepChange}
      />

      <div className="flex min-h-0 min-w-0 flex-col border-border/60 md:border-x">
        <main className={mainScrollClass}>
          <div className={mainInnerClass}>
            {step === "welcome" ? <WelcomeAssay /> : null}
            {step === "info1" ? <BasicInfoStep1 /> : null}
            {step === "info2" ? <BasicInfoStep2 /> : null}
            {step === "info3" ? <BasicInfoStep3 /> : null}
            {step === "alignPattern" ? (
              <StudioAlignPattern
                dataPort={dataPort}
                store={alignStore}
                toolMode={alignToolMode}
                onStatusChange={setAlignStatus}
                onRegisterCommit={(handler) => {
                  alignCommitRef.current = handler;
                }}
              />
            ) : null}
          </div>
        </main>

        <StudioCommandBar
          instruction={instructionForStep(step)}
          step={stepAction}
          tool={
            step === "alignPattern" ? (
              <AlignPatternCommandToolbar mode={alignToolMode} onModeChange={setAlignToolMode} />
            ) : step === "welcome" ? (
              <Button
                className={stepGhostCtaClass}
                disabled={openingAssay}
                type="button"
                variant="ghost"
                onClick={() => {
                  void handleOpenAssay();
                }}
              >
                {openingAssay ? "opening..." : "open assay"}
              </Button>
            ) : null
          }
        />
      </div>

      <aside
        aria-hidden
        className="hidden w-60 min-w-60 shrink-0 border-l border-border/80 bg-card/20 md:block"
      />
    </div>
  );
}
