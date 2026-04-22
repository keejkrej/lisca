import { Button } from "@/components/ui/button";
import { StudioCommandBar } from "./components/studio/StudioCommandBar";
import { StudioNavRail } from "./components/studio/StudioNavRail";
import { BasicInfoStep1 } from "./screens/BasicInfoStep1";
import { BasicInfoStep2 } from "./screens/BasicInfoStep2";
import { WelcomeAssay } from "./screens/WelcomeAssay";
import { instructionForStep } from "./studioCopy";
import { type StudioStep, useStudioStore } from "./studioStore";

function validInfo1(studyName: string, operatorName: string, extra1: string, extra2: string) {
  return (
    studyName.trim().length > 0 &&
    operatorName.trim().length > 0 &&
    extra1.trim().length > 0 &&
    extra2.trim().length > 0
  );
}

export default function App() {
  const step = useStudioStore((s) => s.step);
  const assayId = useStudioStore((s) => s.assayId);
  const info1 = useStudioStore((s) => s.info1);
  const info2 = useStudioStore((s) => s.info2);
  const goNext = useStudioStore((s) => s.goNext);
  const goBack = useStudioStore((s) => s.goBack);
  const submit = useStudioStore((s) => s.submit);

  const canContinue =
    step === "welcome"
      ? Boolean(assayId)
      : step === "info1"
        ? validInfo1(
            info1.studyName,
            info1.operatorName,
            info1.instrumentId,
            info1.lotId,
          )
        : false;

  const canSubmit = info2.sampleId.trim().length > 0;
  const showBack = step !== "welcome";

  const nextOrSubmit = (
    <>
      {step === "info2" ? (
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            submit();
          }}
        >
          Submit
        </Button>
      ) : (
        <Button
          type="button"
          disabled={!canContinue}
          onClick={() => {
            goNext();
          }}
        >
          Next
        </Button>
      )}
    </>
  );

  return (
    <div className="grid h-svh min-h-0 w-full grid-cols-1 overflow-hidden bg-background text-foreground md:grid-cols-[240px_minmax(0,1fr)_240px]">
      <StudioNavRail className="hidden min-h-0 md:flex" />

      <div className="flex min-h-0 min-w-0 flex-col border-border/60 md:border-x">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <div
            className={`mx-auto flex w-full min-w-0 max-w-[52rem] min-h-0 flex-1 flex-col items-center px-4 py-6 sm:px-6 sm:py-8 ${
              step === "welcome" ? "justify-center" : "justify-start"
            }`}
          >
            {step === "welcome" ? <WelcomeAssay /> : null}
            {step === "info1" ? <BasicInfoStep1 /> : null}
            {step === "info2" ? <BasicInfoStep2 /> : null}
          </div>
        </main>

        <StudioCommandBar
          instruction={instructionForStep(step)}
          tool={
            showBack ? (
              <Button type="button" variant="outline" onClick={() => goBack()}>
                Back
              </Button>
            ) : null
          }
          step={nextOrSubmit}
        />
      </div>

      <aside
        aria-hidden
        className="hidden w-60 min-w-60 shrink-0 border-l border-border/80 bg-card/20 md:block"
      />
    </div>
  );
}
