import { RegistryProvider, useAtomValue } from "@effect/atom-solid";
import { ShellWorkspaceProvider } from "@lisca/ui/shell";
import { cleanup, render, waitFor } from "@solidjs/testing-library";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  readTextFile: vi.fn(),
  resumeStudioPendingRuns: vi.fn(async (_options: { workspacePath: string }) => () => {}),
}));

vi.mock("../src/api/studio-port", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("../src/api/studio-port");
  return {
    ...actual,
    studioClient: { ...actual.studioClient, readTextFile: mocks.readTextFile },
  };
});
vi.mock("@lisca/client/session/resume-pending-runs", () => ({
  resumeStudioPendingRuns: mocks.resumeStudioPendingRuns,
}));

import { StudioWorkSessionGate } from "../src/components/studio-work-session-gate";
import { useStudioSession } from "../src/state/studio-session-context";
import {
  buildStudioAssayJsonFromWizard,
  createInitialStudioWizardState,
  studioWizardAtom,
} from "../src/state/studio-store";

const assayJson = buildStudioAssayJsonFromWizard({
  ...createInitialStudioWizardState(),
  name: "TF84",
  dataSourceKind: "nd2",
  dataPath: "/data/TF84.nd2",
  workspacePath: "/data/TF84_portable",
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Open through the Studio session gate", () => {
  it("loads the assay and reattaches runs in its workspace", async () => {
    mocks.readTextFile.mockImplementation(() => Effect.succeed(JSON.stringify(assayJson)));
    let session!: ReturnType<typeof useStudioSession>;
    let wizardName = () => "";
    function Probe() {
      session = useStudioSession();
      const wizard = useAtomValue(() => studioWizardAtom);
      wizardName = () => wizard().name;
      return null;
    }
    render(() => (
      <RegistryProvider>
        <ShellWorkspaceProvider>
          <StudioWorkSessionGate>
            <Probe />
          </StudioWorkSessionGate>
        </ShellWorkspaceProvider>
      </RegistryProvider>
    ));

    const loaded = await session.openAssay("/data/TF84_portable/assay.json");
    expect(loaded.name).toBe("TF84");
    expect(wizardName()).toBe("TF84");
    await waitFor(() => expect(mocks.resumeStudioPendingRuns).toHaveBeenCalledOnce());
    expect(mocks.resumeStudioPendingRuns.mock.calls[0]![0]).toMatchObject({
      workspacePath: "/data/TF84_portable",
    });
  });
});
