import { Button } from "@/components/ui/button";
import { createTauriDesktopPorts } from "lisca/shared/host-tauri";
import { viewerStore } from "lisca/viewer/react";
import { useMemo, useRef } from "react";
import { useStore } from "zustand";

import { StudioCommandBar } from "./components/studio/StudioCommandBar";
import { StudioNavRail } from "./components/studio/StudioNavRail";
import { AlignPattern } from "./screens/AlignPattern";
import { BasicInfoStep1 } from "./screens/BasicInfoStep1";
import { BasicInfoStep2 } from "./screens/BasicInfoStep2";
import { WelcomeAssay } from "./screens/WelcomeAssay";
import { instructionForStep } from "./studioCopy";
import { type BasicInfo2FeatureId, useStudioStore } from "./studioStore";

/** `variant="ghost"`; white label on the command bar. */
const stepGhostCtaClass =
  "text-2xl font-normal text-white shadow-none hover:bg-white/10 hover:text-white data-[pressed]:text-white data-[pressed]:bg-white/10 disabled:text-white/50";

function validInfo1(name: string, date: string, dataPath: string, saveTo: string) {
  return (
    name.trim().length > 0 &&
    date.trim().length > 0 &&
    dataPath.trim().length > 0 &&
    saveTo.trim().length > 0
  );
}

function validInfo2(
  pattern: string,
  timelapseInterval: string,
  selectedFeature: BasicInfo2FeatureId | null,
) {
  return (
    pattern.trim().length > 0 &&
    timelapseInterval.trim().length > 0 &&
    selectedFeature !== null
  );
}

export default function App() {
  const step = useStudioStore((s) => s.step);
  const assayId = useStudioStore((s) => s.assayId);
  const info1 = useStudioStore((s) => s.info1);
  const info2 = useStudioStore((s) => s.info2);
  const goNext = useStudioStore((s) => s.goNext);

  const dataPort = useMemo(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      return createTauriDesktopPorts().dataPort;
    }
    return null;
  }, []);

  const alignCommitRef = useRef<(() => Promise<void>) | null>(null);

  const alignNextDisabled = useStore(viewerStore, (s) =>
    step !== "alignPattern"
      ? false
      : !s.scan ||
        !s.selection ||
        !s.frame ||
        !s.workspacePath?.trim().length ||
        s.loading ||
        s.saving,
  );

  const canContinue =
    step === "welcome"
      ? Boolean(assayId)
      : step === "info1"
        ? validInfo1(info1.name, info1.date, info1.dataPath, info1.saveTo)
        : step === "info2"
          ? validInfo2(
              info2.pattern,
              info2.timelapseInterval,
              info2.selectedFeature,
            )
          : false;

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
        disabled={!canContinue}
        type="button"
        variant="ghost"
        onClick={() => {
          goNext();
        }}
      >
        next
      </Button>
    );

  const isBasicInfoMain = step === "info1" || step === "info2";

  const mainInnerClass = isBasicInfoMain
    ? "mx-auto flex w-full min-h-0 min-w-0 max-w-[52rem] flex-1 flex-col items-center justify-start px-4 py-6 md:px-[100px] md:py-10"
    : step === "alignPattern"
      ? "flex min-h-0 min-w-0 w-full max-w-none flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8"
      : `mx-auto flex w-full min-h-0 min-w-0 max-w-[52rem] flex-1 flex-col items-center px-4 py-6 sm:px-6 sm:py-8 ${
          step === "welcome" ? "justify-center" : "justify-start"
        }`;

  const mainScrollClass =
    step === "alignPattern" ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto";

  return (
    <div className="grid h-svh min-h-0 w-full grid-cols-1 overflow-hidden bg-background text-foreground md:grid-cols-[240px_minmax(0,1fr)_240px]">
      <StudioNavRail className="hidden min-h-0 md:flex" />

      <div className="flex min-h-0 min-w-0 flex-col border-border/60 md:border-x">
        <main className={mainScrollClass}>
          <div className={mainInnerClass}>
            {step === "welcome" ? <WelcomeAssay /> : null}
            {step === "info1" ? <BasicInfoStep1 /> : null}
            {step === "info2" ? <BasicInfoStep2 /> : null}
            {step === "alignPattern" ? (
              <AlignPattern
                dataPort={dataPort}
                onRegisterCommit={(handler) => {
                  alignCommitRef.current = handler;
                }}
              />
            ) : null}
          </div>
        </main>

        <StudioCommandBar instruction={instructionForStep(step)} step={stepAction} tool={null} />
      </div>

      <aside
        aria-hidden
        className="hidden w-60 min-w-60 shrink-0 border-l border-border/80 bg-card/20 md:block"
      />
    </div>
  );
}
