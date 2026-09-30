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
import { savedSnapshotOwnsWorkspace } from "../src/state/use-studio-assay-save";

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
  const onNext = vi.fn();
  render(() => (
    <RegistryProvider initialValues={[[studioWizardAtom, state]]}>
      <StudioMetadataActions onNext={onNext} />
    </RegistryProvider>
  ));
  return { onNext };
}

beforeEach(() => {
  save.assayJsonExists.mockResolvedValue(false);
  save.writeStudioAssayJson.mockClear();
});
afterEach(cleanup);

describe("StudioMetadataActions", () => {
  it("saves unsaved changes explicitly and then reads Saved", async () => {
    renderActions(wizard());

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(save.writeStudioAssayJson).toHaveBeenCalledOnce());
    expect(save.writeStudioAssayJson.mock.calls[0]![0]).toBe("/data/ws");
    const saved = await screen.findByRole("button", { name: "Saved" });
    expect((saved as HTMLButtonElement).disabled).toBe(true);
  });

  it("asks before replacing an assay.json it did not write", async () => {
    save.assayJsonExists.mockResolvedValue(true);
    renderActions(wizard());

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Assay already saved here")).not.toBeNull();
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
  });

  it("updates its own assay.json without asking", async () => {
    save.assayJsonExists.mockResolvedValue(true);
    const base = wizard();
    renderActions({
      ...base,
      name: "TF84 renamed",
      basicInfoSavedSnapshot: serializeBasicInfoSnapshot(base),
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(save.writeStudioAssayJson).toHaveBeenCalledOnce());
    expect(screen.queryByText("Assay already saved here")).toBeNull();
  });
});

describe("savedSnapshotOwnsWorkspace", () => {
  it("matches the workspace recorded in the saved snapshot", () => {
    const snapshot = serializeBasicInfoSnapshot(wizard());
    expect(savedSnapshotOwnsWorkspace(snapshot, "/data/ws")).toBe(true);
    expect(savedSnapshotOwnsWorkspace(snapshot, "/data/other")).toBe(false);
    expect(savedSnapshotOwnsWorkspace(null, "/data/ws")).toBe(false);
    expect(savedSnapshotOwnsWorkspace("not json", "/data/ws")).toBe(false);
  });
});
