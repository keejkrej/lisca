import type { AnalysisFixture } from "@lisca/analysis/fixtures";
import { PanelSection } from "@lisca/ui/shell";
import { For } from "solid-js";

export function DemoAnalysisLeft(props: { fixture: AnalysisFixture }) {
  const samples = () =>
    Object.entries(props.fixture.slideChannelLabels).map(([slide, name]) => ({
      slide,
      name,
    }));

  return (
    <>
      <PanelSection title="Fixture">
        <div class="flex flex-col gap-1 text-sm">
          <p class="font-medium">{props.fixture.title}</p>
          <p class="text-muted-foreground">{props.fixture.description}</p>
        </div>
      </PanelSection>
      <PanelSection title="Samples">
        <div class="flex flex-col gap-1 text-sm">
          <For each={samples()}>
            {(sample) => (
              <div class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground">slide {sample.slide}</span>
                <span class="truncate font-medium">{sample.name}</span>
              </div>
            )}
          </For>
          <div class="mt-2 flex items-center justify-between">
            <span class="text-muted-foreground">Interval</span>
            <span class="font-medium tabular-nums">{props.fixture.intervalMinutes} min</span>
          </div>
        </div>
      </PanelSection>
    </>
  );
}
