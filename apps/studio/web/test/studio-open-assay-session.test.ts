import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

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
import { resetStudioRegistry, studioRegistry } from "../src/state/studio-registry";
import { getActiveStudioSession } from "../src/state/studio-session-context";
import {
  buildStudioAssayJsonFromWizard,
  createInitialStudioWizardState,
  studioWizardAtom,
} from "../src/state/studio-store";
import { cleanupMounted, mountStudioShellTest, waitForCondition } from "./render-helper";

const assayJson = buildStudioAssayJsonFromWizard({
  ...createInitialStudioWizardState(),
  name: "TF84",
  dataSourceKind: "nd2",
  dataPath: "/data/TF84.nd2",
  workspacePath: "/data/TF84_portable",
});

beforeEach(() => {
  resetStudioRegistry();
});

afterEach(async () => {
  await cleanupMounted();
  vi.clearAllMocks();
});

describe("Open through the Studio session gate", () => {
  it("loads the assay and reattaches runs in its workspace", async () => {
    mocks.readTextFile.mockImplementation(() => Effect.succeed(JSON.stringify(assayJson)));

    await mountStudioShellTest((h) =>
      StudioWorkSessionGate(h, {
        key: "session-gate",
        children: h.div.children("studio"),
      }),
    );

    const session = await waitForCondition(() => {
      try {
        return getActiveStudioSession();
      } catch {
        return null;
      }
    });

    const loaded = await session.openAssay("/data/TF84_portable/assay.json");
    expect(loaded.name).toBe("TF84");
    expect(studioRegistry.get(studioWizardAtom).name).toBe("TF84");
    await waitForCondition(() => mocks.resumeStudioPendingRuns.mock.calls.length === 1);
    expect(mocks.resumeStudioPendingRuns.mock.calls[0]![0]).toMatchObject({
      workspacePath: "/data/TF84_portable",
    });
  });
});
