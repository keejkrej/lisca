import {
  inferResultAssayKind,
  resultSectionInstruction,
  resultSectionLabel,
  type ResultPlotSection,
} from "@lisca/analysis";
import {
  buildKillingFixture,
  buildTransfectionFixture,
  fixtureBanner,
  type AnalysisFixture,
  type FixtureAssayId,
} from "@lisca/analysis/fixtures";
import { ResultPlotGallery } from "@lisca/studio-web/result";
import { AppShell, Panel, SidebarStack } from "@lisca/ui/shell";
import { DemoNavbar } from "@lisca/web-demo";
import { createMemo, createSignal, Show } from "solid-js";

import { DemoAnalysisDock } from "./components/demo-analysis-dock";
import { DemoAnalysisLeft } from "./components/demo-analysis-left";
import { DemoAnalysisRight } from "./components/demo-analysis-right";

export type AnalysisDemoProps = {
  embedded?: boolean;
};

const FIXTURES: Record<FixtureAssayId, () => AnalysisFixture> = {
  transfection: buildTransfectionFixture,
  killing: buildKillingFixture,
};

export function AnalysisDemo(props: AnalysisDemoProps) {
  const [assayId, setAssayId] = createSignal<FixtureAssayId>("transfection");
  const [section, setSection] = createSignal<ResultPlotSection>("timeseries");
  const fixture = createMemo(() => FIXTURES[assayId()]());
  const assayKind = createMemo(() => inferResultAssayKind(fixture().files));
  const plots = createMemo(() => fixture().plots.filter((plot) => plot.section === section()));

  const switchAssay = (next: FixtureAssayId) => {
    setAssayId(next);
    setSection("timeseries");
  };

  const shell = (
    <AppShell>
      <AppShell.Header>
        <DemoNavbar
          allowOpenFile={false}
          fileName={fixture().title}
          sampleImages={[
            { id: "transfection", fileName: "transfection.fixture" },
            { id: "killing", fileName: "killing.fixture" },
          ]}
          selectedSampleId={assayId()}
          showThemeToggle={!props.embedded}
          onOpenFile={() => undefined}
          onSampleChange={(value) => {
            if (value === "transfection" || value === "killing") switchAssay(value);
          }}
        />
      </AppShell.Header>
      <AppShell.Body>
        <Show
          when={!props.embedded}
          fallback={
            <AppShell.MainColumn>
              <AppShell.Main>
                <AppShell.MainScroll contentClass="p-2.5">
                  <Panel class="min-h-full w-full">
                    <p class="border-b px-4 py-2 text-xs text-muted-foreground">
                      {fixtureBanner()}
                    </p>
                    <ResultPlotGallery
                      emptyTitle="No plots in this view"
                      emptyMessage="Switch Timeseries and Parameters in the dock."
                      plots={plots()}
                      section={section()}
                    />
                  </Panel>
                </AppShell.MainScroll>
              </AppShell.Main>
              <DemoAnalysisDock
                compact
                section={section()}
                sectionLabels={{
                  timeseries: resultSectionLabel("timeseries", assayKind()),
                  parameters: resultSectionLabel("parameters", assayKind()),
                }}
                onSectionChange={setSection}
              />
            </AppShell.MainColumn>
          }
        >
          <AppShell.Left widthClass="w-72">
            <SidebarStack>
              <DemoAnalysisLeft fixture={fixture()} />
            </SidebarStack>
          </AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.Main>
              <AppShell.MainScroll contentClass="p-2.5">
                <Panel class="min-h-full w-full">
                  <p class="border-b px-4 py-2 text-xs text-muted-foreground">{fixtureBanner()}</p>
                  <ResultPlotGallery
                    emptyTitle="No plots in this view"
                    emptyMessage="Switch Timeseries and Parameters in the dock."
                    plots={plots()}
                    section={section()}
                  />
                </Panel>
              </AppShell.MainScroll>
            </AppShell.Main>
            <AppShell.Dock>
              <DemoAnalysisDock
                section={section()}
                sectionLabels={{
                  timeseries: resultSectionLabel("timeseries", assayKind()),
                  parameters: resultSectionLabel("parameters", assayKind()),
                }}
                onSectionChange={setSection}
              />
            </AppShell.Dock>
          </AppShell.MainColumn>
          <AppShell.Right widthClass="w-72">
            <DemoAnalysisRight
              fileCount={fixture().plots.length}
              instruction={resultSectionInstruction(section(), assayKind())}
              title={fixture().title}
            />
          </AppShell.Right>
        </Show>
      </AppShell.Body>
    </AppShell>
  );

  return (
    <Show when={props.embedded} fallback={shell}>
      <div class="h-full min-h-0">{shell}</div>
    </Show>
  );
}
