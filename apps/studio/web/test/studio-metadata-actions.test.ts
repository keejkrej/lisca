import { Html } from "@effect/ui/html";
import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { resetStudioRegistry, studioRegistry } from "../src/state/studio-registry";
import {
  createInitialStudioWizardState,
  serializeBasicInfoSnapshot,
  studioWizardAtom,
} from "../src/state/studio-store";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  keyDownElement,
  mountTest,
  waitForCondition,
} from "./render-helper";

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

import { StudioMetadataActions } from "../src/components/studio-metadata-actions";
import { studioPageShortcutPlatform } from "../src/navigation/studio-page-shortcuts";

type WizardState = ReturnType<typeof createInitialStudioWizardState>;

const ActionsHost = Html.component({
  name: "StudioMetadataActionsTestHost",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: {},
  view: (h) => StudioMetadataActions(h),
});

function wizard(overrides: Partial<WizardState> = {}): WizardState {
  return {
    ...createInitialStudioWizardState(),
    assayId: ASSAY_TYPE.TRANSFECTION,
    name: "TF84",
    workspacePath: "/data/ws",
    ...overrides,
  };
}

async function mountActions(state: WizardState) {
  studioRegistry.set(studioWizardAtom, state);
  return mountTest(ActionsHost, {});
}

function findButton(root: ParentNode, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll("button")).find(
    (button) => (button.getAttribute("aria-label") ?? button.textContent?.trim()) === label,
  );
}

beforeEach(() => {
  resetStudioRegistry();
  save.assayJsonExists.mockResolvedValue(false);
  save.writeStudioAssayJson.mockClear();
});

afterEach(async () => {
  await cleanupMounted();
  resetStudioRegistry();
});

describe("StudioMetadataActions", () => {
  it("always saves on click, with or without changes", async () => {
    const base = wizard();
    const { container } = await mountActions({
      ...base,
      basicInfoSavedSnapshot: serializeBasicInfoSnapshot(base),
    });

    const button = findButton(container, "Save")!;
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);
    clickElement(button);

    await waitForCondition(() => save.writeStudioAssayJson.mock.calls.length === 1);
    expect(save.writeStudioAssayJson.mock.calls[0]![0]).toBe("/data/ws");
    expect(findButton(container, "Save")).toBe(button);
    await waitForCondition(() => container.textContent?.includes("Saved assay"));
  });

  it("asks before overwriting an existing assay.json, including a loaded one", async () => {
    save.assayJsonExists.mockResolvedValue(true);
    const base = wizard();
    await mountActions({
      ...base,
      name: "TF84 renamed",
      basicInfoSavedSnapshot: serializeBasicInfoSnapshot(base),
    });

    clickElement(findButton(document, "Save")!);
    await waitForCondition(() => document.body.textContent?.includes("Assay already saved here"));
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();

    const overwriteButton = await waitForCondition(() => findButton(document, "Overwrite"));
    clickElement(overwriteButton);

    await waitForCondition(() => save.writeStudioAssayJson.mock.calls.length === 1);
    expect(save.writeStudioAssayJson.mock.calls[0]![1]).toMatchObject({ name: "TF84 renamed" });
  });

  it("saves on the platform save chord", async () => {
    const base = wizard();
    await mountActions({ ...base, basicInfoSavedSnapshot: serializeBasicInfoSnapshot(base) });
    await flushMicrotasks();
    const platform = studioPageShortcutPlatform();
    keyDownElement(window, "s", {
      metaKey: platform === "mac",
      ctrlKey: platform !== "mac",
    });
    await waitForCondition(() => save.writeStudioAssayJson.mock.calls.length === 1);
  });
});
