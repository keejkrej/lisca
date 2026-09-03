import { buildTransfectionFixture, fixtureBanner } from "@lisca/analysis/fixtures";
import { Button } from "@lisca/ui/components";
import {
  AppShell,
  PanelSection,
  RailControlStack,
  RailSidebar,
  ShellThemeProvider,
  StageCanvas,
  ViewportCard,
} from "@lisca/ui/shell";
import { For, Match, Switch, createSignal, type JSX } from "solid-js";

type MockScreen = "aligner" | "annotator" | "studio";

const IBIDI_FRAME = "/demo-images/ibidi/mp_example_singlecell.jpg";

function InertAction(props: { children: JSX.Element; active?: boolean }) {
  return (
    <Button
      class="w-full justify-center"
      size="sm"
      type="button"
      variant={props.active ? "default" : "outline"}
    >
      {props.children}
    </Button>
  );
}

function MockTopBar(props: { screen: MockScreen; onScreen: (screen: MockScreen) => void }) {
  return (
    <div class="flex h-full items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <Button
          size="sm"
          type="button"
          variant={props.screen === "aligner" ? "default" : "outline"}
          onClick={() => props.onScreen("aligner")}
        >
          Align
        </Button>
        <Button
          size="sm"
          type="button"
          variant={props.screen === "annotator" ? "default" : "outline"}
          onClick={() => props.onScreen("annotator")}
        >
          Annotate
        </Button>
        <Button
          size="sm"
          type="button"
          variant={props.screen === "studio" ? "default" : "outline"}
          onClick={() => props.onScreen("studio")}
        >
          Result
        </Button>
      </div>
      <p class="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        Instrument mock · fixtures only
      </p>
    </div>
  );
}

function IbidiSheet(props: { aspect: "wide" | "square"; captionLeft: string }) {
  return (
    <ViewportCard>
      <StageCanvas
        aspect={props.aspect}
        captionLeft={props.captionLeft}
        captionRight="ibidi fixture"
        class={props.aspect === "wide" ? "max-w-[45rem]" : "max-w-[30rem]"}
      >
        <img alt="Fixture frame" class="h-full w-full object-cover" src={IBIDI_FRAME} />
      </StageCanvas>
    </ViewportCard>
  );
}

function AlignBody(props: { screen: MockScreen; onScreen: (screen: MockScreen) => void }) {
  return (
    <>
      <AppShell.Left>
        <RailSidebar>
          <PanelSection appearance="rail" title="Contrast">
            <p class="text-sm text-muted-foreground">Auto range · window</p>
          </PanelSection>
          <PanelSection appearance="rail" title="Tool">
            <RailControlStack>
              <InertAction active>Pan</InertAction>
              <InertAction>Rotate</InertAction>
              <InertAction>Zoom spacing</InertAction>
              <InertAction>Zoom pattern</InertAction>
              <InertAction>Magnifier</InertAction>
            </RailControlStack>
          </PanelSection>
        </RailSidebar>
      </AppShell.Left>
      <AppShell.MainColumn>
        <AppShell.TopBar>
          <MockTopBar screen={props.screen} onScreen={props.onScreen} />
        </AppShell.TopBar>
        <AppShell.Main>
          <IbidiSheet aspect="wide" captionLeft="mp_example_singlecell" />
        </AppShell.Main>
      </AppShell.MainColumn>
      <AppShell.Right>
        <RailSidebar>
          <PanelSection appearance="rail" title="Grid">
            <RailControlStack>
              <InertAction active>Show</InertAction>
              <InertAction>Reset</InertAction>
            </RailControlStack>
          </PanelSection>
          <PanelSection appearance="rail" title="Selection">
            <p class="text-sm text-muted-foreground">Included 84 · Excluded 12</p>
          </PanelSection>
          <PanelSection appearance="rail" title="Action">
            <RailControlStack>
              <InertAction>Save</InertAction>
            </RailControlStack>
          </PanelSection>
        </RailSidebar>
      </AppShell.Right>
    </>
  );
}

function AnnotateBody(props: { screen: MockScreen; onScreen: (screen: MockScreen) => void }) {
  return (
    <>
      <AppShell.Left>
        <RailSidebar>
          <PanelSection appearance="rail" title="Contrast">
            <p class="text-sm text-muted-foreground">Auto range · window</p>
          </PanelSection>
          <PanelSection appearance="rail" title="Tool">
            <RailControlStack>
              <InertAction active>Brush</InertAction>
              <InertAction>Eraser</InertAction>
              <InertAction>Fill</InertAction>
              <InertAction>Magnifier</InertAction>
            </RailControlStack>
          </PanelSection>
        </RailSidebar>
      </AppShell.Left>
      <AppShell.MainColumn>
        <AppShell.TopBar>
          <MockTopBar screen={props.screen} onScreen={props.onScreen} />
        </AppShell.TopBar>
        <AppShell.Main>
          <IbidiSheet aspect="square" captionLeft="Site 1 · GFP" />
        </AppShell.Main>
      </AppShell.MainColumn>
      <AppShell.Right>
        <RailSidebar>
          <PanelSection appearance="rail" title="Mode">
            <RailControlStack>
              <InertAction active>Segmentation</InertAction>
              <InertAction>Classification</InertAction>
            </RailControlStack>
          </PanelSection>
          <PanelSection appearance="rail" title="Labels">
            <p class="text-sm text-muted-foreground">Cell · Background · Debris</p>
          </PanelSection>
          <PanelSection appearance="rail" title="Action">
            <RailControlStack>
              <InertAction>Save</InertAction>
            </RailControlStack>
          </PanelSection>
        </RailSidebar>
      </AppShell.Right>
    </>
  );
}

function ResultBody(props: { screen: MockScreen; onScreen: (screen: MockScreen) => void }) {
  const fixture = buildTransfectionFixture();
  const plots = fixture.plots.filter((plot) => plot.section === "timeseries");

  return (
    <>
      <AppShell.Left>
        <RailSidebar>
          <PanelSection appearance="rail" title="Tasks">
            <RailControlStack>
              <InertAction>Assay</InertAction>
              <InertAction>Info</InertAction>
              <InertAction>Align</InertAction>
              <InertAction>Annotate</InertAction>
              <InertAction active>Result</InertAction>
            </RailControlStack>
          </PanelSection>
        </RailSidebar>
      </AppShell.Left>
      <AppShell.MainColumn>
        <AppShell.TopBar>
          <MockTopBar screen={props.screen} onScreen={props.onScreen} />
        </AppShell.TopBar>
        <AppShell.Main>
          <AppShell.MainScroll contentClass="relative max-w-[840px] px-6 py-8">
            <p class="mb-4 text-xs text-muted-foreground">{fixtureBanner()}</p>
            <h2 class="mb-6 text-2xl font-semibold leading-8 tracking-[-0.02em]">Timeseries</h2>
            <div class="flex flex-col gap-8 pb-8">
              <For each={plots}>
                {(plot) => (
                  <figure class="flex flex-col gap-2">
                    <figcaption class="truncate text-[13px] font-medium leading-[18px]">
                      {plot.title}
                    </figcaption>
                    <img alt={plot.title} class="w-full rounded-[18px]" src={plot.src} />
                  </figure>
                )}
              </For>
            </div>
          </AppShell.MainScroll>
        </AppShell.Main>
      </AppShell.MainColumn>
      <AppShell.Right>
        <RailSidebar>
          <PanelSection appearance="rail" title="Instruction">
            <p class="text-sm leading-snug text-muted-foreground">
              Timeseries plots from the transfection fixture. Rail controls are inert.
            </p>
          </PanelSection>
          <PanelSection appearance="rail" title="View">
            <RailControlStack>
              <InertAction active>Timeseries</InertAction>
              <InertAction>Parameters</InertAction>
            </RailControlStack>
          </PanelSection>
        </RailSidebar>
      </AppShell.Right>
    </>
  );
}

export function InstrumentMock() {
  const [screen, setScreen] = createSignal<MockScreen>("aligner");

  return (
    <ShellThemeProvider appId={screen()}>
      <AppShell>
        <AppShell.Body>
          <Switch>
            <Match when={screen() === "aligner"}>
              <AlignBody screen={screen()} onScreen={setScreen} />
            </Match>
            <Match when={screen() === "annotator"}>
              <AnnotateBody screen={screen()} onScreen={setScreen} />
            </Match>
            <Match when={screen() === "studio"}>
              <ResultBody screen={screen()} onScreen={setScreen} />
            </Match>
          </Switch>
        </AppShell.Body>
      </AppShell>
    </ShellThemeProvider>
  );
}
