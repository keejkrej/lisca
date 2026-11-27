import { Router, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  StudioNavigationMessage,
  StudioNavigationProvider,
  StudioRoute,
  studioRouteForPath,
} from "../src/navigation/studio-router";
import { resetStudioRegistry, studioRegistry } from "../src/state/studio-registry";
import {
  createInitialStudioWizardState,
  isBasicInfoDirty,
  studioWizardAtom,
} from "../src/state/studio-store";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  mountTest,
  waitForCondition,
} from "./render-helper";

type WizardState = ReturnType<typeof createInitialStudioWizardState>;

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

import { StudioMetadataLeaveGuard } from "../src/components/studio-metadata-leave-guard";

const TriggerMsg = UiSchema.TaggedEnum({
  Leave: {},
});

const LeaveHarness = Html.component({
  name: "LeaveGuardHarness",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: TriggerMsg,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({}),
  update: {
    Leave: ($) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to: "/align" })),
  },
  view: (h) =>
    h.div.children(
      StudioMetadataLeaveGuard(h),
      h.output.attr("data-testid", "pathname").children(h.reads.nav.pathname),
      h.output.attr("data-testid", "pending").children(h.reads.nav.pendingLeaveTo ?? ""),
      h.button
        .attr("type", "button")
        .attr("data-testid", "trigger-leave")
        .on("click", TriggerMsg.Leave())
        .children("Leave"),
    ),
});

const GuardHost = Html.component({
  name: "LeaveGuardTestHost",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: {},
  view: (h) =>
    StudioNavigationProvider(h, {
      props: { initialRoute: studioRouteForPath("/metadata") },
      view: () => LeaveHarness(h, { props: {} }),
    }),
});

function dirtyWizard(overrides: Partial<WizardState> = {}): WizardState {
  return { ...createInitialStudioWizardState(), name: "A", ...overrides };
}

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

async function mountGuard(state: WizardState) {
  studioRegistry.set(studioWizardAtom, state);
  const routerLayer = Router.memory({ routes: StudioRoute, url: "/metadata" });
  const mounted = await mountTest(GuardHost, {}, { layer: routerLayer });
  const triggerLeave = () => {
    const btn = mounted.container.querySelector<HTMLButtonElement>('[data-testid="trigger-leave"]');
    if (!btn) throw new Error("trigger-leave button not found");
    clickElement(btn);
  };
  const pathname = () =>
    mounted.container.querySelector('[data-testid="pathname"]')?.textContent ?? "";
  const pending = () =>
    mounted.container.querySelector('[data-testid="pending"]')?.textContent ?? "";
  return { ...mounted, triggerLeave, pathname, pending };
}

beforeEach(() => {
  resetStudioRegistry();
  save.assayJsonExists.mockResolvedValue(false);
  save.writeStudioAssayJson.mockResolvedValue(undefined);
});

afterEach(async () => {
  await cleanupMounted();
  vi.clearAllMocks();
  resetStudioRegistry();
});

describe("StudioMetadataLeaveGuard save guard", () => {
  it("surfaces a clear error and stays blocked when Save is clicked without a workspace folder", async () => {
    const { triggerLeave, pathname, pending } = await mountGuard(
      dirtyWizard({ workspacePath: "" }),
    );
    triggerLeave();

    await waitForCondition(() => findDialogByTitle("Metadata changed"));
    expect(pending()).toBe("/align");

    clickElement(findButton(document, "Save")!);

    const alert = await waitForCondition(() => document.querySelector('[role="alert"]'));
    expect(alert.textContent).toMatch(/Pick a workspace folder before saving/i);

    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
    expect(save.assayJsonExists).not.toHaveBeenCalled();
    expect(pathname()).toBe("/metadata");
    expect(pending()).toBe("/align");

    const saveButton = findButton(document, "Save")!;
    expect(saveButton.disabled).toBe(false);
  });

  it("writes assay.json and proceeds when Save succeeds on a dirty wizard", async () => {
    const { triggerLeave, pathname, pending } = await mountGuard(
      dirtyWizard({ workspacePath: "/assays/run-1" }),
    );
    triggerLeave();

    await waitForCondition(() => findDialogByTitle("Metadata changed"));
    clickElement(findButton(document, "Save")!);

    await waitForCondition(
      () => save.writeStudioAssayJson.mock.calls.length === 1 && pathname() === "/align",
    );
    expect(pending()).toBe("");
    expect(save.assayJsonExists).toHaveBeenCalledWith("/assays/run-1");
    expect(save.assayJsonExists).toHaveBeenCalledTimes(1);
    expect(save.writeStudioAssayJson).toHaveBeenCalledWith("/assays/run-1", expect.anything());
    expect(workSession.touchStudioWorkSessionFromAssayPath).toHaveBeenCalledWith(
      "/assays/run-1/assay.json",
      "A",
    );
    expect(memory.recordStudioAssayMemory).toHaveBeenCalledWith(
      "/assays/run-1/assay.json",
      expect.objectContaining({ name: "A", workspace: { path: "/assays/run-1" } }),
    );
    expect(studioRegistry.get(studioWizardAtom).basicInfoSavedSnapshot).not.toBeNull();
  });

  it("prompts to overwrite and then saves when assay.json already exists", async () => {
    save.assayJsonExists.mockResolvedValue(true);
    const { triggerLeave, pathname, pending } = await mountGuard(
      dirtyWizard({ workspacePath: "/existing" }),
    );
    triggerLeave();

    await waitForCondition(() => findDialogByTitle("Metadata changed"));
    clickElement(findButton(document, "Save")!);

    await waitForCondition(() => findDialogByTitle("Assay already saved here"));
    expect(findDialogByTitle("Metadata changed")).toBeUndefined();
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
    expect(pathname()).toBe("/metadata");
    expect(pending()).toBe("/align");

    clickElement(findButton(document, "Overwrite")!);

    await waitForCondition(
      () => save.writeStudioAssayJson.mock.calls.length === 1 && pathname() === "/align",
    );
    expect(save.assayJsonExists).toHaveBeenCalledTimes(1);
    expect(save.writeStudioAssayJson).toHaveBeenCalledWith("/existing", expect.anything());
    expect(studioRegistry.get(studioWizardAtom).basicInfoSavedSnapshot).not.toBeNull();
  });

  it("proceeds without writing when the user skips saving", async () => {
    const { triggerLeave, pathname, pending } = await mountGuard(
      dirtyWizard({ workspacePath: "" }),
    );
    triggerLeave();

    await waitForCondition(() => findDialogByTitle("Metadata changed"));
    clickElement(findButton(document, "Skip Save")!);

    await waitForCondition(() => pathname() === "/align");
    expect(pending()).toBe("");
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
  });

  it("resets the blocker without writing when the user cancels", async () => {
    const { triggerLeave, pathname, pending } = await mountGuard(
      dirtyWizard({ workspacePath: "" }),
    );
    triggerLeave();

    await waitForCondition(() => findDialogByTitle("Metadata changed"));
    clickElement(findButton(document, "Cancel")!);

    await waitForCondition(() => pending() === "");
    await flushMicrotasks();
    expect(pathname()).toBe("/metadata");
    expect(findDialogByTitle("Metadata changed")).toBeUndefined();
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
  });

  it("clears a stale save error after retrying Save with a workspace folder picked", async () => {
    const { triggerLeave, pathname, pending } = await mountGuard(
      dirtyWizard({ workspacePath: "" }),
    );
    triggerLeave();

    await waitForCondition(() => findDialogByTitle("Metadata changed"));
    clickElement(findButton(document, "Save")!);
    const alert = await waitForCondition(() => document.querySelector('[role="alert"]'));
    expect(alert.textContent).toMatch(/workspace folder before saving/i);

    clickElement(findButton(document, "Cancel")!);
    await waitForCondition(() => pending() === "");

    studioRegistry.set(studioWizardAtom, dirtyWizard({ workspacePath: "/picked" }));
    triggerLeave();

    await waitForCondition(() => findDialogByTitle("Metadata changed"));
    expect(document.querySelector('[role="alert"]')).toBeNull();

    clickElement(findButton(document, "Save")!);
    await waitForCondition(
      () => save.writeStudioAssayJson.mock.calls.length === 1 && pathname() === "/align",
    );

    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(studioRegistry.get(studioWizardAtom).basicInfoSavedSnapshot).not.toBeNull();
  });
});

describe("StudioMetadataLeaveGuard dirty trigger", () => {
  it("marks the wizard dirty when a non-default assay is picked without a workspace folder", () => {
    const initial = createInitialStudioWizardState();
    expect(isBasicInfoDirty(initial)).toBe(false);

    const killing: WizardState = {
      ...initial,
      assayId: ASSAY_TYPE.KILLING_DEATH_REPORTER,
      analysis: null,
    };
    expect(killing.workspacePath).toBe("");
    expect(isBasicInfoDirty(killing)).toBe(true);
  });
});
