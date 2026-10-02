import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { RegistryProvider } from "@effect/atom-solid";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  createInitialStudioWizardState,
  serializeBasicInfoSnapshot,
  studioWizardAtom,
} from "../src/state/studio-store";

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

function wizard(overrides: Partial<WizardState> = {}): WizardState {
  return {
    ...createInitialStudioWizardState(),
    assayId: ASSAY_TYPE.TRANSFECTION,
    name: "TF84",
    workspacePath: "/data/ws",
    ...overrides,
  };
}

function renderActions(state: WizardState) {
  render(() => (
    <RegistryProvider initialValues={[[studioWizardAtom, state]]}>
      <StudioMetadataActions />
    </RegistryProvider>
  ));
}

beforeEach(() => {
  save.assayJsonExists.mockResolvedValue(false);
  save.writeStudioAssayJson.mockClear();
});
afterEach(cleanup);

describe("StudioMetadataActions", () => {
  it("always saves on click, with or without changes", async () => {
    const base = wizard();
    renderActions({ ...base, basicInfoSavedSnapshot: serializeBasicInfoSnapshot(base) });

    const button = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    await waitFor(() => expect(save.writeStudioAssayJson).toHaveBeenCalledOnce());
    expect(save.writeStudioAssayJson.mock.calls[0]![0]).toBe("/data/ws");
    expect(screen.getByRole("button", { name: "Save" })).toBe(button);
  });

  it("asks before overwriting an existing assay.json, including a loaded one", async () => {
    save.assayJsonExists.mockResolvedValue(true);
    const base = wizard();
    renderActions({
      ...base,
      name: "TF84 renamed",
      basicInfoSavedSnapshot: serializeBasicInfoSnapshot(base),
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Assay already saved here")).not.toBeNull();
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Overwrite" }));
    await waitFor(() => expect(save.writeStudioAssayJson).toHaveBeenCalledOnce());
    expect(save.writeStudioAssayJson.mock.calls[0]![1]).toMatchObject({ name: "TF84 renamed" });
  });

  it("saves on the platform save chord", async () => {
    const base = wizard();
    renderActions({ ...base, basicInfoSavedSnapshot: serializeBasicInfoSnapshot(base) });
    const platform = studioPageShortcutPlatform();
    fireEvent.keyDown(window, {
      key: "s",
      metaKey: platform === "mac",
      ctrlKey: platform !== "mac",
      bubbles: true,
      cancelable: true,
    });
    await waitFor(() => expect(save.writeStudioAssayJson).toHaveBeenCalledOnce());
  });
});
