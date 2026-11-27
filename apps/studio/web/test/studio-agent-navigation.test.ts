import { Router, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  ShellWorkspaceControlSessionSchema,
  type ShellWorkspaceControlSession,
} from "@lisca/ui/shell";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioAgentNavigation } from "../src/components/studio-agent-navigation";
import {
  StudioNavigationProvider,
  StudioRoute,
  studioRouteForPath,
} from "../src/navigation/studio-router";
import { setActiveStudioSession } from "../src/state/studio-session-context";
import { cleanupMounted, clickElement, mountTest, waitForCondition } from "./render-helper";

const baseSession: ShellWorkspaceControlSession = {
  workspacePath: "/data/demo",
  mode: "agent-running",
  agentName: "pi",
  revision: 1,
};

const HarnessMsg = UiSchema.TaggedEnum({
  SetCrop: {},
  SetAnalysis: {},
});

const AgentNavHarness = Html.component({
  name: "StudioAgentNavigationHarness",
  props: Schema.Struct({}),
  model: Schema.Struct({
    sessions: Schema.Array(ShellWorkspaceControlSessionSchema),
  }),
  message: HarnessMsg,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({ sessions: [baseSession] }),
  update: {
    SetCrop: ($) =>
      $.evolve({
        sessions: [
          {
            ...baseSession,
            operation: { requestId: "crop-1", kind: "crop" as const, label: "Cropping Pos67" },
          },
        ],
      }),
    SetAnalysis: ($) =>
      $.evolve({
        sessions: [
          {
            ...baseSession,
            operation: {
              requestId: "analysis-1",
              kind: "analysis" as const,
              label: "Running analysis",
            },
          },
        ],
      }),
  },
  view: (h, model) =>
    h.div.children(
      StudioAgentNavigation(h, { sessions: model.sessions }),
      h.output.attr("data-testid", "pathname").children(h.reads.nav.pathname),
      h.button
        .attr("type", "button")
        .attr("data-testid", "set-crop")
        .on("click", HarnessMsg.SetCrop())
        .children("Set crop"),
      h.button
        .attr("type", "button")
        .attr("data-testid", "set-analysis")
        .on("click", HarnessMsg.SetAnalysis())
        .children("Set analysis"),
    ),
});

const AgentNavHost = Html.component({
  name: "StudioAgentNavigationTestHost",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: {},
  view: (h) =>
    StudioNavigationProvider(h, {
      props: { initialRoute: studioRouteForPath("/") },
      view: () => AgentNavHarness(h, { props: {} }),
    }),
});

afterEach(async () => {
  await cleanupMounted();
  setActiveStudioSession(null);
});

describe("StudioAgentNavigation", () => {
  it("opens an idle agent workspace once and moves crop/analysis to their routes", async () => {
    const openAssay = vi.fn(async () => ({}) as never);
    setActiveStudioSession({ openAssay });

    const routerLayer = Router.memory({ routes: StudioRoute, url: "/" });
    const { container } = await mountTest(AgentNavHost, {}, { layer: routerLayer });

    const pathname = () => container.querySelector('[data-testid="pathname"]')?.textContent ?? "";

    await waitForCondition(() => openAssay.mock.calls.length === 1);
    expect(openAssay).toHaveBeenCalledWith("/data/demo/assay.json");
    await waitForCondition(() => pathname() === "/metadata");

    clickElement(container.querySelector('[data-testid="set-crop"]')!);
    await waitForCondition(() => pathname() === "/annotate");

    clickElement(container.querySelector('[data-testid="set-analysis"]')!);
    await waitForCondition(() => pathname() === "/analysis");
    expect(openAssay).toHaveBeenCalledTimes(1);
  });
});
