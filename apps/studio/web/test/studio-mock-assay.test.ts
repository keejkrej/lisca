import { View } from "@effect/ui";
import { createInitialAlignUiState, createStudioPersist } from "@lisca/client/atoms/align-ui";
import { STUDIO_ALIGN_SESSION_KEY } from "@lisca/client/atoms/align-ui-studio";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { resetStudioRegistry, studioRegistry } from "../src/state/studio-registry";
import { cleanupMounted, mountStudioShellTest, waitForCondition } from "./render-helper";

const mocks = vi.hoisted(() => ({
  assayPath: null as string | null,
  readTextFile: vi.fn(),
  resumeStudioPendingRuns: vi.fn(async (_options: { workspacePath: string }) => () => {}),
}));

vi.mock("../src/api/studio-mock", () => ({
  studioMockAssayPath: () => mocks.assayPath,
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
import {
  buildStudioAssayJsonFromWizard,
  createInitialStudioWizardState,
  studioWizardAtom,
} from "../src/state/studio-store";

const assayJson = buildStudioAssayJsonFromWizard({
  ...createInitialStudioWizardState(),
  name: "Fixture",
  dataSourceKind: "nd2",
  dataPath: "/data/fixture.nd2",
  workspacePath: "/data/fixture-workspace",
});

const savedSource = {
  kind: "folder" as const,
  path: "/data/saved-source",
  subfolderTemplate: "Pos{pos}",
  filenameTemplate: "img.tif",
};

beforeEach(() => {
  resetStudioRegistry();
});

afterEach(async () => {
  await cleanupMounted();
  mocks.assayPath = null;
  sessionStorage.clear();
  window.location.hash = "";
  vi.clearAllMocks();
  resetStudioRegistry();
});

async function mountGate(probe: () => Promise<unknown> = () => Promise.resolve("ok")) {
  await mountStudioShellTest((h) => StudioWorkSessionGate(h, { children: View.text("") }), {
    probe,
  });
  return {
    wizardName: () => studioRegistry.get(studioWizardAtom).name,
  };
}

describe("Studio browser mock", () => {
  it("does not open an assay when mock mode is off", async () => {
    mocks.assayPath = null;
    await mountGate();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mocks.readTextFile).not.toHaveBeenCalled();
  });

  it("opens the fixture assay once the server answers and ignores a saved workspace", async () => {
    createStudioPersist(STUDIO_ALIGN_SESSION_KEY).write({
      ...createInitialAlignUiState(),
      workspacePath: "/data/saved-workspace",
      source: savedSource,
    });
    mocks.assayPath = "/data/fixture-workspace/assay.json";
    mocks.readTextFile.mockImplementation(() => Effect.succeed(JSON.stringify(assayJson)));
    const { wizardName } = await mountGate();

    await waitForCondition(() => mocks.readTextFile.mock.calls.length === 1);
    expect(mocks.readTextFile).toHaveBeenCalledWith("/data/fixture-workspace/assay.json");
    await waitForCondition(() => wizardName() === "Fixture");
    expect(window.location.hash).toBe("#/metadata");
    expect(mocks.resumeStudioPendingRuns.mock.calls.map((call) => call[0]?.workspacePath)).toEqual([
      "/data/fixture-workspace",
    ]);
  });

  it("retries a failed read and then opens Metadata", async () => {
    mocks.assayPath = "/data/fixture-workspace/assay.json";
    let reads = 0;
    mocks.readTextFile.mockImplementation(() => {
      reads += 1;
      if (reads === 1) return Effect.fail(new Error("server down"));
      return Effect.succeed(JSON.stringify(assayJson));
    });
    const { wizardName } = await mountGate(() => Promise.reject(new Error("down")));

    await waitForCondition(() => wizardName() === "Fixture", 4_000);
    expect(window.location.hash).toBe("#/metadata");
    expect(reads).toBeGreaterThanOrEqual(2);
  });
});
