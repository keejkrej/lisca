import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ASSAY_TYPE } from "@lisca/contracts/assay";

import { createInitialStudioWizardState, isBasicInfoDirty } from "../src/state/studio-store";

type WizardState = ReturnType<typeof createInitialStudioWizardState>;
type BlockerState = {
  status: "idle" | "blocked";
  proceed: () => void;
  reset: () => void;
};

// `vi.hoisted` callbacks run before import initialization, so they must not
// reference imports (e.g. `createSignal`). They only seed holders that the
// (also hoisted) `vi.mock` factories can read. Solid signals are created at
// module scope below and wired into these holders, keeping the guard's
// reactivity intact while staying isolated from the `Atom.keepAlive` registry
// (which otherwise leaks wizard state across tests).

const wizardHolder = vi.hoisted(() => ({
  read: undefined as unknown as () => WizardState,
  write: undefined as unknown as (u: WizardState | ((p: WizardState) => WizardState)) => void,
}));

const blockerHolder = vi.hoisted(() => ({
  read: undefined as unknown as () => BlockerState,
  write: undefined as unknown as (b: BlockerState) => void,
}));

// The save side-effects the guard delegates to (`assayJsonExists` /
// `writeStudioAssayJson`) call into the studio port; mock them as plain async
// fns so we never hit the network and can assert call args.
const save = vi.hoisted(() => ({
  assayJsonExists: vi.fn(async (_saveTo: string) => false),
  writeStudioAssayJson: vi.fn(async (_saveTo: string, _json: unknown) => undefined),
}));

// Session/memory side-effects of a successful save; stub so jsdom storage is
// untouched and so call args can be asserted.
const workSession = vi.hoisted(() => ({ touchStudioWorkSessionFromAssayPath: vi.fn() }));
const memory = vi.hoisted(() => ({ recordStudioAssayMemory: vi.fn() }));

vi.mock("@effect/atom-solid", () => ({
  useAtomValue: () => wizardHolder.read,
  useAtomSet: () => wizardHolder.write,
}));

vi.mock("@tanstack/solid-router", () => ({
  useBlocker: () => blockerHolder.read,
}));

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
    // `studioAssayJsonPathForSaveTo` stays real (pure path join); only the
    // storage-touching side effect is stubbed.
    ...actual,
    touchStudioWorkSessionFromAssayPath: workSession.touchStudioWorkSessionFromAssayPath,
  };
});

import { StudioBasicInfoLeaveGuard } from "../src/components/studio-basic-info-leave-guard";

// Module-scope Solid signals wired into the hoisted holders above. The guard
// reads/writes through the mocked hooks, which read/write these signals, so
// mutating them from a test updates the guard reactively.
const wizardSignal = createSignal<WizardState>(createInitialStudioWizardState());
const blockerSignal = createSignal<BlockerState>({
  status: "idle",
  proceed: () => {},
  reset: () => {},
});
wizardHolder.read = wizardSignal[0];
wizardHolder.write = wizardSignal[1] as typeof wizardHolder.write;
blockerHolder.read = blockerSignal[0];
blockerHolder.write = blockerSignal[1] as typeof blockerHolder.write;

function resetWizard(state: WizardState = createInitialStudioWizardState()) {
  wizardSignal[1](state);
}

function block() {
  blockerSignal[1]({ status: "blocked", proceed: vi.fn(), reset: vi.fn() });
}

function currentBlocker() {
  return blockerSignal[0]();
}

// A dirty wizard (name differs from the empty baseline) is the state the bug
// lives in. Overrides let each test pick the exact reachable sub-state.
function dirtyWizard(overrides: Partial<WizardState> = {}): WizardState {
  return { ...createInitialStudioWizardState(), name: "A", ...overrides };
}

beforeEach(() => {
  resetWizard();
  blockerSignal[1]({ status: "idle", proceed: vi.fn(), reset: vi.fn() });
  save.assayJsonExists.mockResolvedValue(false);
  save.writeStudioAssayJson.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetWizard();
  blockerSignal[1]({ status: "idle", proceed: vi.fn(), reset: vi.fn() });
});

describe("StudioBasicInfoLeaveGuard save guard", () => {
  it("surfaces a clear error and stays blocked when Save is clicked without a workspace folder", async () => {
    resetWizard(dirtyWizard({ workspacePath: "" }));
    block();

    render(() => <StudioBasicInfoLeaveGuard />);

    await screen.findByRole("dialog", { name: "Info changed" });

    await fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // FIX: the error slot now renders instead of silently returning false.
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Pick a workspace folder before saving/i);

    // No save attempted and the blocker is never advanced — the navigation
    // stays parked, exactly as before, but now with user-visible feedback.
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
    expect(save.assayJsonExists).not.toHaveBeenCalled();
    expect(currentBlocker().proceed).not.toHaveBeenCalled();

    // The modal stays open and the Save button stays usable (no spinner state
    // is set on this path), so the user can act on the error.
    const saveButton = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it("writes assay.json and proceeds when Save succeeds on a dirty wizard", async () => {
    resetWizard(dirtyWizard({ workspacePath: "/assays/run-1" }));
    block();

    render(() => <StudioBasicInfoLeaveGuard />);

    await screen.findByRole("dialog", { name: "Info changed" });
    await fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(save.writeStudioAssayJson).toHaveBeenCalled();
      expect(currentBlocker().proceed).toHaveBeenCalled();
    });

    expect(save.assayJsonExists).toHaveBeenCalledWith("/assays/run-1");
    expect(save.assayJsonExists).toHaveBeenCalledTimes(1);
    expect(save.writeStudioAssayJson).toHaveBeenCalledWith("/assays/run-1", expect.anything());
    expect(workSession.touchStudioWorkSessionFromAssayPath).toHaveBeenCalledWith(
      "/assays/run-1/assay.json",
      "A",
    );
    expect(memory.recordStudioAssayMemory).toHaveBeenCalledWith(
      "/assays/run-1/assay.json",
      "A",
      "/assays/run-1",
    );
    expect(wizardSignal[0]().basicInfoSavedSnapshot).not.toBeNull();
  });

  it("prompts to overwrite and then saves when assay.json already exists", async () => {
    save.assayJsonExists.mockResolvedValue(true);
    resetWizard(dirtyWizard({ workspacePath: "/existing" }));
    block();

    render(() => <StudioBasicInfoLeaveGuard />);

    await screen.findByRole("dialog", { name: "Info changed" });
    await fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // The save modal closes and the overwrite modal opens; nothing written yet.
    await screen.findByRole("dialog", { name: "Assay already saved here" });
    expect(screen.queryByRole("dialog", { name: "Info changed" })).toBeNull();
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
    expect(currentBlocker().proceed).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole("button", { name: "Overwrite" }));

    await waitFor(() => {
      expect(save.writeStudioAssayJson).toHaveBeenCalled();
      expect(currentBlocker().proceed).toHaveBeenCalled();
    });
    // The overwrite path short-circuits the existence check.
    expect(save.assayJsonExists).toHaveBeenCalledTimes(1);
    expect(save.writeStudioAssayJson).toHaveBeenCalledWith("/existing", expect.anything());
    expect(wizardSignal[0]().basicInfoSavedSnapshot).not.toBeNull();
  });

  it("proceeds without writing when the user skips saving", async () => {
    resetWizard(dirtyWizard({ workspacePath: "" }));
    block();

    render(() => <StudioBasicInfoLeaveGuard />);

    await screen.findByRole("dialog", { name: "Info changed" });
    await fireEvent.click(screen.getByRole("button", { name: "Skip Save" }));

    expect(currentBlocker().proceed).toHaveBeenCalled();
    expect(currentBlocker().reset).not.toHaveBeenCalled();
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
  });

  it("resets the blocker without writing when the user cancels", async () => {
    resetWizard(dirtyWizard({ workspacePath: "" }));
    block();

    render(() => <StudioBasicInfoLeaveGuard />);

    await screen.findByRole("dialog", { name: "Info changed" });
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(currentBlocker().reset).toHaveBeenCalled();
    expect(currentBlocker().proceed).not.toHaveBeenCalled();
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
  });

  it("clears a stale save error after retrying Save with a workspace folder picked", async () => {
    // First attempt: dirty + no workspace folder -> error shown, navigation blocked.
    resetWizard(dirtyWizard({ workspacePath: "" }));
    block();

    render(() => <StudioBasicInfoLeaveGuard />);

    await screen.findByRole("dialog", { name: "Info changed" });
    await fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/workspace folder before saving/i);

    // User cancels (which clears the error), picks a workspace folder, then
    // re-triggers the blocked navigation and saves successfully.
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    resetWizard(dirtyWizard({ workspacePath: "/picked" }));
    block();

    await screen.findByRole("dialog", { name: "Info changed" });
    expect(screen.queryByRole("alert")).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(save.writeStudioAssayJson).toHaveBeenCalled();
      expect(currentBlocker().proceed).toHaveBeenCalled();
    });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(wizardSignal[0]().basicInfoSavedSnapshot).not.toBeNull();
  });
});

describe("StudioBasicInfoLeaveGuard dirty trigger", () => {
  it("marks the wizard dirty when a non-default assay is picked without a workspace folder", () => {
    const initial = createInitialStudioWizardState();
    expect(isBasicInfoDirty(initial)).toBe(false);

    // Mirrors `studioWizardActions.setAssayId(KILLING)` on a fresh wizard:
    // assayId flips to "killing" and the transfection-only analysis section
    // drops to null, so the serialized snapshot differs from the baseline —
    // all while `workspacePath` stays empty.
    const killing: WizardState = { ...initial, assayId: ASSAY_TYPE.KILLING, analysis: null };
    expect(killing.workspacePath).toBe("");
    expect(isBasicInfoDirty(killing)).toBe(true);
  });
});
