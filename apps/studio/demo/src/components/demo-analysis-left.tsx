import type { AnalysisFixture } from "@lisca/analysis/fixtures";
import { PanelSection } from "@lisca/ui/shell";
import { For } from "solid-js";

export function DemoAnalysisLeft(props: { fixture: AnalysisFixture }) {
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
          <For each={props.fixture.sampleNames}>
            {(name) => <span class="truncate font-medium">{name}</span>}
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
