import { RegistryProvider, useAtomValue } from "@effect/atom-solid";
import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui/shell";
import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mockFlag = vi.hoisted(() => ({
  assayPath: null as string | null,
}));

vi.mock("../src/api/studio-mock", () => ({
  studioMockAssayPath: () => mockFlag.assayPath,
}));

vi.mock("@lisca/client/session/task-center", () => ({
  createTaskCenterGateway: () => ({
    listTasks: async () => [],
    getTask: async () => null,
    getStep: async () => null,
    cancelTask: async () => null,
    dismissTask: async () => null,
    cancelStep: async () => null,
    retryStep: async () => null,
  }),
  subscribeTaskCenterTasks: ({ onSnapshot }: { onSnapshot: (tasks: unknown[]) => void }) => {
    onSnapshot([]);
    return () => undefined;
  },
}));

import { routeTree } from "../src/routeTree.gen";
import {
  buildStudioFeedbackIssueUrl,
  formatStudioFeedbackMarkdown,
  readStudioFeedbackDraft,
} from "../src/state/studio-onboarding";
import {
  createInitialStudioWizardState,
  studioWizardAtom,
  type AssayId,
} from "../src/state/studio-store";

function createMemoryStorage(): LiscaStorageAdapter {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

let testStorage: LiscaStorageAdapter;
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

beforeEach(() => {
  mockFlag.assayPath = null;
  testStorage = createMemoryStorage();
  configureLiscaStorage({ local: testStorage, session: createMemoryStorage() });
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: () => undefined,
      matches: false,
      media: query,
      removeEventListener: () => undefined,
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderStudioRouter(initialEntry = "/", initialWizard = createInitialStudioWizardState()) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  let currentAssayId: () => AssayId | null = () => initialWizard.assayId;
  function StateProbe() {
    const wizard = useAtomValue(() => studioWizardAtom);
    currentAssayId = () => wizard().assayId;
    return null;
  }
  render(() => (
    <RegistryProvider initialValues={[[studioWizardAtom, initialWizard] as const]}>
      <ShellThemeProvider appId="studio">
        <ShellServerProvider probe={() => Promise.resolve("ok")}>
          <ShellWorkspaceProvider>
            <StateProbe />
            <RouterProvider router={router} />
          </ShellWorkspaceProvider>
        </ShellServerProvider>
      </ShellThemeProvider>
    </RegistryProvider>
  ));
  return { router, currentAssayId };
}

async function expectLnpAssays() {
  const group = await screen.findByRole("group", { name: "Assay type" });
  expect(within(group).getByRole("button", { name: /LNP binding/ })).toBeTruthy();
  expect(within(group).getByRole("button", { name: /LNP transfection/ })).toBeTruthy();
  expect(
    within(group)
      .getAllByRole("button")
      .slice(0, 2)
      .map((button) => button.textContent),
  ).toEqual([expect.stringContaining("LNP transfection"), expect.stringContaining("LNP binding")]);
  expect(within(group).queryByRole("button", { name: /Killing/ })).toBeNull();
}

describe("Studio optional research guide", () => {
  it("filters workflows by field without saving interests or changing an edited assay, and resets on return", async () => {
    const { router, currentAssayId } = renderStudioRouter("/assay", {
      ...createInitialStudioWizardState(),
      assayId: "transfection",
      name: "Already edited transfection",
    });
    await expectLnpAssays();
    const fields = screen.getByRole("group", { name: "Research field" });
    expect(within(fields).getAllByRole("button")).toHaveLength(2);
    expect(within(fields).queryByRole("button", { name: "All assays" })).toBeNull();
    fireEvent.click(within(fields).getByRole("button", { name: "LNP delivery" }));
    const assays = screen.getByRole("group", { name: "Assay type" });
    expect(within(assays).getByRole("button", { name: /LNP binding/ })).toBeTruthy();
    expect(within(assays).getByRole("button", { name: /LNP transfection/ })).toBeTruthy();
    expect(
      within(assays)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("LNP transfection"),
      expect.stringContaining("LNP binding"),
    ]);
    expect(within(assays).queryByRole("button", { name: /Killing/ })).toBeNull();

    fireEvent.click(within(fields).getByRole("button", { name: "Cell killing" }));
    expect(within(assays).getByRole("button", { name: /Killing \(death reporter\)/ })).toBeTruthy();
    expect(within(assays).getByRole("button", { name: /Killing \(label-free\)/ })).toBeTruthy();
    expect(within(assays).queryByRole("button", { name: /LNP binding/ })).toBeNull();
    expect(within(assays).getByRole("button", { name: /Killing \(engagement\)/ })).toBeTruthy();
    expect(currentAssayId()).toBe("transfection");
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();

    const guide = screen.getByRole("button", { name: "Research guide" });
    expect(
      guide.parentElement?.contains(screen.getByRole("button", { name: "Help us improve LiSCA" })),
    ).toBe(true);
    expect(screen.queryByText("Research", { exact: true })).toBeNull();
    fireEvent.click(guide);
    expect(
      await screen.findByRole("heading", { name: "How LiSCA can help your research" }),
    ).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Continue to Assay" })[0]!);
    await waitFor(() => expect(router.state.location.pathname).toBe("/assay"));
    await expectLnpAssays();
    expect(currentAssayId()).toBe("transfection");
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();
  });

  it("starts on LNP delivery and ignores research interests saved by older versions", async () => {
    const legacyProfile = JSON.stringify({
      completed: false,
      interests: ["pharmacology"],
      activeArea: "pharmacology",
    });
    testStorage.setItem("lisca-studio-onboarding", legacyProfile);
    const { router } = renderStudioRouter("/");
    await expectLnpAssays();
    expect(router.state.location.pathname).toBe("/assay");
    expect(screen.queryByRole("group", { name: "Research area" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Research interests/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Change research interests/ })).toBeNull();
    expect(testStorage.getItem("lisca-studio-onboarding")).toBe(legacyProfile);
    fireEvent.click(screen.getByRole("button", { name: "Research guide" }));
    expect(
      await screen.findByRole("heading", { name: "How LiSCA can help your research" }),
    ).toBeTruthy();
  });

  it("opens the field of an existing killing assay without storing a field preference", async () => {
    renderStudioRouter("/assay", {
      ...createInitialStudioWizardState(),
      assayId: "killing-engagement",
      name: "Existing killing assay",
    });
    const fields = await screen.findByRole("group", { name: "Research field" });
    expect(
      within(fields).getByRole("button", { name: "Cell killing" }).getAttribute("aria-pressed"),
    ).toBe("true");
    const assays = screen.getByRole("group", { name: "Assay type" });
    expect(
      within(assays)
        .getByRole("button", { name: /Killing \(engagement\)/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(within(assays).queryByRole("button", { name: /LNP/ })).toBeNull();
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();
  });

  it("browses every research area without saving interests or changing the selected assay", async () => {
    const { router, currentAssayId } = renderStudioRouter("/onboarding");
    expect(
      await screen.findByRole("heading", { name: "How LiSCA can help your research" }),
    ).toBeTruthy();
    const originalAssay = currentAssayId();
    expect(screen.queryByRole("group", { name: "Research interests" })).toBeNull();
    expect(
      screen.getByText(/Neither measurement alone establishes uptake or endosomal escape/),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", { name: /Sample LNP binding plot showing cumulative spots per ROI/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: /Sample transfection plot showing background-corrected GFP fluorescence traces/,
      }),
    ).toBeTruthy();
    expect(screen.getByRole("img", { name: /Sample pharmacology survival curve/ })).toBeTruthy();
    expect(screen.getAllByText("Targeted LNP").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Schnitzbauer et al\./).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Müller et al\. \(2024\)/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/One Workspace from microscope acquisition to figures/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Continue to Assay" })[0]!);
    await waitFor(() => expect(router.state.location.pathname).toBe("/assay"));
    await expectLnpAssays();
    expect(currentAssayId()).toBe(originalAssay);
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();
  });

  it("selects an explicitly requested assay in its field without saving a profile", async () => {
    const { router, currentAssayId } = renderStudioRouter("/onboarding");
    fireEvent.click(await screen.findByRole("button", { name: "Use LNP binding" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/assay"));
    await expectLnpAssays();
    expect(currentAssayId()).toBe("lnp-binding");
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();
  });

  it("preserves an edited assay when browsing the guide and choosing another workflow", async () => {
    const { router, currentAssayId } = renderStudioRouter("/onboarding", {
      ...createInitialStudioWizardState(),
      assayId: "transfection",
      name: "Already edited transfection",
    });
    fireEvent.click(await screen.findByRole("button", { name: "Use LNP binding" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/assay"));
    expect(currentAssayId()).toBe("transfection");
    await expectLnpAssays();
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();
  });
});

describe("Help us improve LiSCA page", () => {
  it("saves optional feedback drafts without creating a research profile and formats GitHub issues", async () => {
    renderStudioRouter("/help-us");

    expect(await screen.findByRole("heading", { name: "Help us improve LiSCA" })).toBeTruthy();

    fireEvent.input(screen.getByLabelText("What do you study?"), {
      target: { value: "3D tumor spheroids in microwells" },
    });
    fireEvent.input(screen.getByLabelText("What do you need to measure?"), {
      target: { value: "Radial caspase-3 activation wave speed" },
    });
    fireEvent.input(screen.getByLabelText("What is missing in LiSCA?"), {
      target: { value: "Z-stack maximum intensity projection during crop" },
    });
    fireEvent.input(screen.getByLabelText("Lab or contact (optional)"), {
      target: { value: "@spheroid-lab" },
    });

    const saveButtons = screen.getAllByRole("button", { name: "Save" });
    fireEvent.click(saveButtons[0]!);

    const saved = readStudioFeedbackDraft();
    expect(saved.studyFocus).toBe("3D tumor spheroids in microwells");
    expect(saved.measurementsNeeded).toBe("Radial caspase-3 activation wave speed");
    expect(saved.missingWorkflow).toBe("Z-stack maximum intensity projection during crop");
    expect(saved.contact).toBe("@spheroid-lab");
    expect(saved.updatedAt).not.toBeNull();

    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();

    const markdown = formatStudioFeedbackMarkdown(saved);
    expect(markdown).toContain("### What we study\n3D tumor spheroids in microwells");
    expect(markdown).toContain("### Measurements needed\nRadial caspase-3 activation wave speed");

    const issueUrl = new URL(buildStudioFeedbackIssueUrl(saved));
    expect(issueUrl.origin + issueUrl.pathname).toBe(
      "https://github.com/keejkrej/lisca/issues/new",
    );
    expect(issueUrl.searchParams.get("title")).toBe(
      "Research workflow feedback: 3D tumor spheroids in microwells",
    );
  });
});
