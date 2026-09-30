import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { RegistryProvider, useAtomSet, useAtomValue } from "@effect/atom-solid";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  createInitialStudioWizardState,
  serializeBasicInfoSnapshot,
  studioWizardActions,
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

import { useReplaceDocumentGuard } from "../src/components/studio-replace-document-guard";

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

function renderGuard(state: WizardState) {
  let current = () => state;
  function Harness() {
    const wizard = useAtomValue(() => studioWizardAtom);
    const setWizard = useAtomSet(() => studioWizardAtom);
    current = wizard;
    const guard = useReplaceDocumentGuard();
    return (
      <>
        <button
          type="button"
          onClick={() =>
            guard.replaceDocument(() => studioWizardActions.newAssay(setWizard, wizard().assayId))
          }
        >
          New
        </button>
        {guard.prompts()}
      </>
    );
  }
  render(() => (
    <RegistryProvider initialValues={[[studioWizardAtom, state]]}>
      <Harness />
    </RegistryProvider>
  ));
  return { wizard: () => current() };
}

beforeEach(() => {
  save.assayJsonExists.mockResolvedValue(false);
  save.writeStudioAssayJson.mockClear();
});
afterEach(cleanup);

describe("replace-document guard (New / Open)", () => {
  it("starts a blank assay at once when nothing is unsaved", () => {
    const { wizard } = renderGuard(savedLoaded);
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(screen.queryByText("Save changes?")).toBeNull();
    expect(wizard().name).toBe("");
    expect(wizard().workspacePath).toBe("");
    expect(wizard().basicInfoSavedSnapshot).toBeNull();
    expect(wizard().assayId).toBe(ASSAY_TYPE.TRANSFECTION);
  });

  it("asks Save / Don't Save / Cancel when there are unsaved changes", async () => {
    const { wizard } = renderGuard({ ...savedLoaded, name: "TF84 edited" });

    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(await screen.findByText("Save changes?")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(wizard().name).toBe("TF84 edited");

    fireEvent.click(screen.getByRole("button", { name: "New" }));
    fireEvent.click(await screen.findByRole("button", { name: "Don't Save" }));
    expect(wizard().name).toBe("");
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
  });

  it("saves first (through the overwrite guard) and then starts the new assay", async () => {
    save.assayJsonExists.mockResolvedValue(true);
    const { wizard } = renderGuard({ ...savedLoaded, name: "TF84 edited" });

    fireEvent.click(screen.getByRole("button", { name: "New" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    expect(await screen.findByText("Assay already saved here")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Overwrite" }));

    await waitFor(() => expect(save.writeStudioAssayJson).toHaveBeenCalledOnce());
    expect(save.writeStudioAssayJson.mock.calls[0]![1]).toMatchObject({ name: "TF84 edited" });
    await waitFor(() => expect(wizard().name).toBe(""));
  });

  it("keeps the selected assay type for the new assay", () => {
    const { wizard } = renderGuard({
      ...createInitialStudioWizardState(),
      assayId: ASSAY_TYPE.KILLING,
    });
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(wizard().assayId).toBe(ASSAY_TYPE.KILLING);
  });
});
