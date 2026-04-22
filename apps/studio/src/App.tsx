import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";

import { BasicInfoStep1 } from "./screens/BasicInfoStep1";
import { BasicInfoStep2 } from "./screens/BasicInfoStep2";
import { WelcomeAssay } from "./screens/WelcomeAssay";
import { type StudioStep, useStudioStore } from "./studioStore";

function stepLabel(step: StudioStep): string {
  switch (step) {
    case "welcome":
      return "Assay";
    case "info1":
      return "Run details";
    case "info2":
      return "Sample";
    default:
      return "";
  }
}

function stepFraction(step: StudioStep): number {
  switch (step) {
    case "welcome":
      return 1;
    case "info1":
      return 2;
    case "info2":
      return 3;
    default:
      return 1;
  }
}

export default function App() {
  const step = useStudioStore((s) => s.step);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b bg-card/40">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 py-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">LISCA Studio</p>
              <h1 className="font-semibold text-lg tracking-tight">{stepLabel(step)}</h1>
            </div>
            <p className="text-muted-foreground text-sm tabular-nums">
              Step {stepFraction(step)} of 3
            </p>
          </div>
          <Progress value={stepFraction(step)} min={0} max={3}>
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-8">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          {step === "welcome" ? <WelcomeAssay /> : null}
          {step === "info1" ? <BasicInfoStep1 /> : null}
          {step === "info2" ? <BasicInfoStep2 /> : null}
        </div>
      </main>
    </div>
  );
}
