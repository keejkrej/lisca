import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const save = vi.hoisted(() => ({
  assayJsonExists: vi.fn(async (_saveTo: string) => false),
  writeStudioAssayJson: vi.fn(async (_saveTo: string, _json: unknown) => undefined),
}));

vi.mock("../src/utils/save-studio-assay", () => ({
  assayJsonExists: save.assayJsonExists,
  writeStudioAssayJson: save.writeStudioAssayJson,
}));
vi.mock("../src/utils/studio-memory", () => ({ recordStudioAssayMemory: vi.fn() }));
vi.mock("@lisca/client/session/work-session", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@lisca/client/session/work-session");
  return { ...actual, touchStudioWorkSessionFromAssayPath: vi.fn() };
});

import {
  shouldGuardReplaceDocument,
  StudioReplaceDocumentGuard,
} from "../src/components/studio-replace-document-guard";
import { resetStudioRegistry, setStudioAtom, studioRegistry } from "../src/state/studio-registry";
import {
  createInitialStudioWizardState,
  serializeBasicInfoSnapshot,
  studioWizardActions,
  studioWizardAtom,
} from "../src/state/studio-store";
import { cleanupMounted, clickElement, mountTest, waitForCondition } from "./render-helper";

type WizardState = ReturnType<typeof createInitialStudioWizardState>;

const loaded: WizardState = {
  ...createInitialStudioWizardState(),
  assayId: ASSAY_TYPE.TRANSFECTION,
  name: "TF84",
  workspacePath: "/data/ws",
};
const savedLoaded: WizardState = {
  ...loaded,
  basicInfoSavedSnapshot: serializeBasicInfoSnapshot(loaded),
};

const HarnessMsg = UiSchema.TaggedEnum({
  ClickNew: {},
  Confirmed: {},
  Cancelled: {},
});

function startNewAssay(): void {
  const currentAssayId = studioRegistry.get(studioWizardAtom).assayId;
  studioWizardActions.newAssay((update) => setStudioAtom(studioWizardAtom, update), currentAssayId);
}

const GuardHarness = Html.component({
  name: "ReplaceDocumentGuardHarness",
  props: Schema.Struct({}),
  model: Schema.Struct({
    guardOpen: Schema.Boolean,
  }),
  message: HarnessMsg,
}).make({
  init: () => ({ guardOpen: false }),
  update: {
    ClickNew: ($) => {
      if (shouldGuardReplaceDocument()) {
        return $.evolve({ guardOpen: true });
      }
      startNewAssay();
      return $.model;
    },
    Confirmed: ($) => {
      startNewAssay();
      return $.evolve({ guardOpen: false });
    },
    Cancelled: ($) => $.evolve({ guardOpen: false }),
  },
  view: (h, model) =>
    h.div.children(
      h.button.attr("type", "button").on("click", HarnessMsg.ClickNew()).children("New"),
      StudioReplaceDocumentGuard(h, {
        key: "replace-guard",
        open: model.guardOpen,
        onConfirm: HarnessMsg.Confirmed(),
        onCancel: HarnessMsg.Cancelled(),
      }),
    ),
});

function findButton(container: HTMLElement, name: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => (button.textContent ?? "").trim() === name,
  );
}

async function renderGuard(state: WizardState) {
  resetStudioRegistry();
  studioRegistry.set(studioWizardAtom, state);
  const mounted = await mountTest(GuardHarness, {});
  return {
    container: mounted.container,
    wizard: () => studioRegistry.get(studioWizardAtom),
  };
}

beforeEach(() => {
  save.assayJsonExists.mockResolvedValue(false);
  save.writeStudioAssayJson.mockClear();
});

afterEach(async () => {
  await cleanupMounted();
});

describe("replace-document guard (New / Open)", () => {
  it("starts a blank assay at once when nothing is unsaved", async () => {
    const { container, wizard } = await renderGuard(savedLoaded);
    clickElement(findButton(container, "New")!);
    await waitForCondition(() => wizard().name === "");
    expect(container.textContent).not.toContain("Save changes?");
    expect(wizard().name).toBe("");
    expect(wizard().workspacePath).toBe("");
    expect(wizard().basicInfoSavedSnapshot).toBeNull();
    expect(wizard().assayId).toBe(ASSAY_TYPE.TRANSFECTION);
  });

  it("asks Save / Don't Save / Cancel when there are unsaved changes", async () => {
    const { container, wizard } = await renderGuard({ ...savedLoaded, name: "TF84 edited" });

    clickElement(findButton(container, "New")!);
    await waitForCondition(() => (container.textContent ?? "").includes("Save changes?"));
    clickElement(findButton(container, "Cancel")!);
    await waitForCondition(() => !(container.textContent ?? "").includes("Save changes?"));
    expect(wizard().name).toBe("TF84 edited");

    clickElement(findButton(container, "New")!);
    const dontSave = await waitForCondition(() => findButton(container, "Don't Save"));
    clickElement(dontSave);
    await waitForCondition(() => wizard().name === "");
    expect(wizard().name).toBe("");
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
  });

  it("saves first (through the overwrite guard) and then starts the new assay", async () => {
    save.assayJsonExists.mockResolvedValue(true);
    const { container, wizard } = await renderGuard({ ...savedLoaded, name: "TF84 edited" });

    clickElement(findButton(container, "New")!);
    const saveBtn = await waitForCondition(() => findButton(container, "Save"));
    clickElement(saveBtn);
    await waitForCondition(() =>
      (container.textContent ?? "").includes("Assay already saved here"),
    );
    clickElement(findButton(container, "Overwrite")!);

    await waitForCondition(() => save.writeStudioAssayJson.mock.calls.length === 1);
    expect(save.writeStudioAssayJson.mock.calls[0]![1]).toMatchObject({ name: "TF84 edited" });
    await waitForCondition(() => wizard().name === "");
  });

  it("keeps the selected assay type for the new assay", async () => {
    const { container, wizard } = await renderGuard({
      ...createInitialStudioWizardState(),
      assayId: ASSAY_TYPE.KILLING_DEATH_REPORTER,
    });
    clickElement(findButton(container, "New")!);
    await waitForCondition(() => wizard().assayId === ASSAY_TYPE.KILLING_DEATH_REPORTER);
    expect(wizard().assayId).toBe(ASSAY_TYPE.KILLING_DEATH_REPORTER);
  });
});
