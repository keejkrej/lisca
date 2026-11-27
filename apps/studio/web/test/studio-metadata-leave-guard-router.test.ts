import { Router, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  StudioNavigationMessage,
  StudioNavigationProvider,
  StudioRoute,
  studioRouteForPath,
} from "../src/navigation/studio-router";
import { resetStudioRegistry, studioRegistry } from "../src/state/studio-registry";
import { createInitialStudioWizardState, studioWizardAtom } from "../src/state/studio-store";
import { cleanupMounted, clickElement, mountTest, waitForCondition } from "./render-helper";

const save = vi.hoisted(() => ({
  assayJsonExists: vi.fn(async (_saveTo: string) => false),
  writeStudioAssayJson: vi.fn(async (_saveTo: string, _json: unknown) => undefined),
}));
const workSession = vi.hoisted(() => ({ touchStudioWorkSessionFromAssayPath: vi.fn() }));
const memory = vi.hoisted(() => ({ recordStudioAssayMemory: vi.fn() }));

vi.mock("../src/utils/save-studio-assay", () => ({
  assayJsonExists: save.assayJsonExists,
  writeStudioAssayJson: save.writeStudioAssayJson,
}));

vi.mock("../src/utils/studio-memory", () => ({
  recordStudioAssayMemory: memory.recordStudioAssayMemory,
}));

vi.mock("@lisca/client/session/work-session", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@lisca/client/session/work-session");
  return {
    ...actual,
    touchStudioWorkSessionFromAssayPath: workSession.touchStudioWorkSessionFromAssayPath,
  };
});

import {
  StudioMetadataLeaveGuard,
  shouldGuardMetadataLeave,
} from "../src/components/studio-metadata-leave-guard";

type WizardState = ReturnType<typeof createInitialStudioWizardState>;

function dirtyWizard(overrides: Partial<WizardState> = {}): WizardState {
  return { ...createInitialStudioWizardState(), name: "A", ...overrides };
}

const NavMsg = UiSchema.TaggedEnum({
  GoTo: { to: Schema.String },
});

const RouterLayout = Html.component({
  name: "MetadataLeaveGuardRouterLayout",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: NavMsg,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({}),
  update: {
    GoTo: ($, { to }) => $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to })),
  },
  view: (h) => {
    const pathname = h.reads.nav.pathname;
    return h.div.children(
      StudioMetadataLeaveGuard(h),
      h.output.attr("data-testid", "pathname").children(pathname),
      pathname === "/metadata" ? h.div.children("Metadata page") : undefined,
      pathname === "/align" ? h.div.children("Align page") : undefined,
      h.button
        .attr("type", "button")
        .attr("data-testid", "go-align")
        .on("click", NavMsg.GoTo({ to: "/align" }))
        .children("Go Align"),
      h.button
        .attr("type", "button")
        .attr("data-testid", "go-metadata")
        .on("click", NavMsg.GoTo({ to: "/metadata" }))
        .children("Go Metadata"),
    );
  },
});

const RouterHost = Html.component({
  name: "MetadataLeaveGuardRouterHost",
  props: Schema.Struct({
    initialPath: Schema.String,
  }),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: {},
  view: (h) =>
    StudioNavigationProvider(h, {
      props: { initialRoute: studioRouteForPath(h.props.initialPath) },
      view: () => RouterLayout(h, { props: {} }),
    }),
});

function findDialogByTitle(title: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((dialog) => {
    const labelledBy = dialog.getAttribute("aria-labelledby");
    if (labelledBy) {
      const heading = document.getElementById(labelledBy);
      if (heading?.textContent?.trim() === title) return true;
    }
    return dialog.getAttribute("aria-label") === title;
  });
}

function findButton(root: ParentNode, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll("button")).find(
    (button) => (button.getAttribute("aria-label") ?? button.textContent?.trim()) === label,
  );
}

async function mountWithRouter(initialWizard: WizardState, initialPath = "/metadata") {
  studioRegistry.set(studioWizardAtom, initialWizard);
  const routerLayer = Router.memory({ routes: StudioRoute, url: initialPath });
  const mounted = await mountTest(RouterHost, { initialPath }, { layer: routerLayer });
  const pathname = () =>
    mounted.container.querySelector('[data-testid="pathname"]')?.textContent ?? "";
  const navigateTo = (to: "/align" | "/metadata") => {
    const selector = to === "/align" ? '[data-testid="go-align"]' : '[data-testid="go-metadata"]';
    const btn = mounted.container.querySelector<HTMLButtonElement>(selector);
    if (!btn) throw new Error(`Button ${selector} not found`);
    clickElement(btn);
  };
  return { ...mounted, pathname, navigateTo };
}

beforeEach(() => {
  resetStudioRegistry();
});

afterEach(async () => {
  await cleanupMounted();
  vi.clearAllMocks();
  save.assayJsonExists.mockResolvedValue(false);
  save.writeStudioAssayJson.mockResolvedValue(undefined);
  resetStudioRegistry();
});

describe("StudioMetadataLeaveGuard real-router integration", () => {
  it("parks navigation and surfaces the workspace-folder error when Save is clicked without a folder", async () => {
    const { container, pathname, navigateTo } = await mountWithRouter(
      dirtyWizard({ workspacePath: "" }),
    );

    await waitForCondition(() => container.textContent?.includes("Metadata page"));

    navigateTo("/align");

    await waitForCondition(() => findDialogByTitle("Metadata changed"));
    expect(pathname()).toBe("/metadata");

    clickElement(findButton(document, "Save")!);

    const alert = await waitForCondition(() => document.querySelector('[role="alert"]'));
    expect(alert.textContent).toMatch(/Pick a workspace folder before saving/i);

    expect(pathname()).toBe("/metadata");
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
    expect(save.assayJsonExists).not.toHaveBeenCalled();

    clickElement(findButton(document, "Skip Save")!);
    await waitForCondition(() => pathname() === "/align");
    expect(container.textContent).toContain("Align page");
  });

  it("advances navigation after a successful save on a dirty wizard with a workspace folder", async () => {
    const { container, pathname, navigateTo } = await mountWithRouter(
      dirtyWizard({ workspacePath: "/ws/run-1" }),
    );

    await waitForCondition(() => container.textContent?.includes("Metadata page"));

    navigateTo("/align");

    await waitForCondition(() => findDialogByTitle("Metadata changed"));
    expect(pathname()).toBe("/metadata");

    clickElement(findButton(document, "Save")!);

    await waitForCondition(
      () => save.writeStudioAssayJson.mock.calls.length === 1 && pathname() === "/align",
    );

    expect(save.assayJsonExists).toHaveBeenCalledWith("/ws/run-1");
    expect(save.writeStudioAssayJson).toHaveBeenCalledWith("/ws/run-1", expect.anything());
  });

  it("lets a dirty wizard enter Metadata without asking", async () => {
    const { container, pathname, navigateTo } = await mountWithRouter(
      dirtyWizard({ workspacePath: "/ws/run-1" }),
      "/align",
    );

    await waitForCondition(() => container.textContent?.includes("Align page"));
    navigateTo("/metadata");

    await waitForCondition(() => container.textContent?.includes("Metadata page"));
    expect(pathname()).toBe("/metadata");
    expect(findDialogByTitle("Metadata changed")).toBeUndefined();
  });
});

describe("shouldGuardMetadataLeave", () => {
  it("only guards unsaved changes when leaving Metadata", () => {
    expect(shouldGuardMetadataLeave("/metadata", "/align", true)).toBe(true);
    expect(shouldGuardMetadataLeave("/metadata", "/assay", true)).toBe(true);
    expect(shouldGuardMetadataLeave("/metadata", "/align", false)).toBe(false);
    expect(shouldGuardMetadataLeave("/assay", "/metadata", true)).toBe(false);
    expect(shouldGuardMetadataLeave("/align", "/annotate", true)).toBe(false);
    expect(shouldGuardMetadataLeave("/metadata", "/metadata", true)).toBe(false);
  });
});
