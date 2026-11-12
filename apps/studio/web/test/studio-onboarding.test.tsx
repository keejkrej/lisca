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

import { ChooseAssay } from "../src/components/choose-assay";
import { routeTree } from "../src/routeTree.gen";
import {
  buildStudioFeedbackIssueUrl,
  formatStudioFeedbackMarkdown,
  readStudioFeedbackDraft,
  readStudioOnboarding,
  studioOnboardingAtom,
  type StudioOnboardingState,
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

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

beforeEach(() => {
  mockFlag.assayPath = null;
  configureLiscaStorage({
    local: createMemoryStorage(),
    session: createMemoryStorage(),
  });
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

function renderStudioRouter(
  initialEntry = "/",
  onboardingState: StudioOnboardingState = {
    completed: false,
    interests: [],
    activeArea: "all",
  },
) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  let currentAssayId: () => AssayId | null = () => null;
  let currentOnboarding: () => StudioOnboardingState = () => onboardingState;

  function StateProbe() {
    const wizard = useAtomValue(() => studioWizardAtom);
    const onboarding = useAtomValue(() => studioOnboardingAtom);
    currentAssayId = () => wizard().assayId;
    currentOnboarding = () => onboarding();
    return null;
  }

  render(() => (
    <RegistryProvider
      initialValues={[
        [studioWizardAtom, createInitialStudioWizardState()] as const,
        [studioOnboardingAtom, onboardingState] as const,
      ]}
    >
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

  return { router, currentAssayId, currentOnboarding };
}

describe("Studio research onboarding and tailored guide", () => {
  it("redirects first-time visitors at / to /onboarding, tailors sample figures and references, and lands on filtered assays", async () => {
    const { router, currentAssayId, currentOnboarding } = renderStudioRouter("/");

    expect(await screen.findByRole("heading", { name: "What do you study?" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/onboarding");

    const interestsGroup = screen.getByRole("group", { name: "Research interests" });
    const lnpOption = within(interestsGroup).getByRole("button", {
      name: /RNA delivery and LNPs/,
    });
    expect(lnpOption.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(lnpOption);
    expect(lnpOption.getAttribute("aria-pressed")).toBe("true");

    // Advance to Step 2: How LiSCA can help your research
    const continueButtons = screen.getAllByRole("button", { name: "Continue" });
    fireEvent.click(continueButtons[0]!);

    expect(
      await screen.findByRole("heading", { name: "How LiSCA can help your research" }),
    ).toBeTruthy();

    // Explicit scientific distinction between binding and expression
    expect(
      screen.getByText(/Neither measurement alone establishes uptake or endosomal escape/),
    ).toBeTruthy();

    // Sample figures and sample output table are shown for RNA delivery and LNPs
    expect(
      screen.getByRole("img", {
        name: /Sample LNP binding plot showing cumulative spots per ROI/,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: /Sample transfection plot showing background-corrected GFP fluorescence traces/,
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("Targeted LNP").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Schnitzbauer et al\./).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Müller et al\. \(2024\)/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/One Workspace from microscope acquisition to figures/)).toBeTruthy();

    // Unselected research areas stay hidden unless expanded
    expect(screen.queryByRole("img", { name: /Sample pharmacology survival curve/ })).toBeNull();

    const showAllToggle = screen.getByRole("button", { name: /Show all areas/ });
    fireEvent.click(showAllToggle);
    expect(
      await screen.findByRole("img", { name: /Sample pharmacology survival curve/ }),
    ).toBeTruthy();
    fireEvent.click(showAllToggle);

    // Choose LNP binding directly from the guide card
    fireEvent.click(screen.getByRole("button", { name: "Use LNP binding" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/assay"));
    expect(currentOnboarding().completed).toBe(true);
    expect(currentOnboarding().activeArea).toBe("lnp-delivery");
    expect(readStudioOnboarding().completed).toBe(true);
    expect(currentAssayId()).toBe("lnp-binding");

    // On the Assay page, an LNP researcher sees only LNP binding and Transfection — no killing assays
    const assayGroup = await screen.findByRole("group", { name: "Assay type" });
    expect(within(assayGroup).getByRole("button", { name: /LNP binding/ })).toBeTruthy();
    expect(within(assayGroup).getByRole("button", { name: /Transfection/ })).toBeTruthy();
    expect(within(assayGroup).queryByRole("button", { name: /Killing/ })).toBeNull();

    // Browse all assays restores full discovery immediately
    fireEvent.click(screen.getByRole("button", { name: "Browse all assays" }));
    expect(
      await within(assayGroup).findByRole("button", { name: /Killing \(death reporter\)/ }),
    ).toBeTruthy();
  });

  it("skips /onboarding on / when mock mode is active or onboarding is already completed", async () => {
    mockFlag.assayPath = "/mock/assay.json";
    const mockRun = renderStudioRouter("/");
    await waitFor(() => expect(mockRun.router.state.location.pathname).toBe("/assay"));
    cleanup();

    mockFlag.assayPath = null;
    configureLiscaStorage({
      local: (() => {
        const storage = createMemoryStorage();
        storage.setItem(
          "lisca-studio-onboarding",
          JSON.stringify({
            completed: true,
            interests: ["cancer-immunology"],
            activeArea: "cancer-immunology",
          }),
        );
        return storage;
      })(),
      session: createMemoryStorage(),
    });

    const returningRun = renderStudioRouter("/", {
      completed: true,
      interests: ["cancer-immunology"],
      activeArea: "cancer-immunology",
    });
    await waitFor(() => expect(returningRun.router.state.location.pathname).toBe("/assay"));
  });
});

describe("Two-level Assay selection", () => {
  it("filters assays by research area and preserves open/dirty wizard assay selection", async () => {
    const dirtyWizard = {
      ...createInitialStudioWizardState(),
      assayId: "transfection" as const,
      name: "Already edited transfection",
    };

    render(() => (
      <RegistryProvider
        initialValues={[
          [studioWizardAtom, dirtyWizard] as const,
          [
            studioOnboardingAtom,
            {
              completed: true,
              interests: ["lnp-delivery", "expression-kinetics"],
              activeArea: "selected",
            },
          ] as const,
        ]}
      >
        <ChooseAssay />
      </RegistryProvider>
    ));

    const areaGroup = screen.getByRole("group", { name: "Research area" });
    const assayGroup = screen.getByRole("group", { name: "Assay type" });

    // Multi-interest union hides killing assays
    expect(within(areaGroup).getByRole("button", { name: "My research areas" })).toBeTruthy();
    expect(within(assayGroup).getByRole("button", { name: /LNP binding/ })).toBeTruthy();
    expect(within(assayGroup).getByRole("button", { name: /Transfection/ })).toBeTruthy();
    expect(within(assayGroup).queryByRole("button", { name: /Killing/ })).toBeNull();

    // Switching to Cancer immunology shows engagement + death reporter + label-free, without clobbering dirty wizard
    fireEvent.click(within(areaGroup).getByRole("button", { name: "Cancer immunology" }));
    expect(
      await within(assayGroup).findByRole("button", { name: /Killing \(engagement\)/ }),
    ).toBeTruthy();
    expect(
      within(assayGroup).getByRole("button", { name: /Killing \(death reporter\)/ }),
    ).toBeTruthy();
    expect(within(assayGroup).getByRole("button", { name: /Killing \(label-free\)/ })).toBeTruthy();
    expect(within(assayGroup).queryByRole("button", { name: /LNP binding/ })).toBeNull();
    expect(
      within(assayGroup)
        .getByRole("button", { name: /Killing \(engagement\)/ })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });
});

describe("Help us improve LiSCA page", () => {
  it("stores research feedback separately from onboarding personalization and formats GitHub issues", async () => {
    const initialOnboarding: StudioOnboardingState = {
      completed: true,
      interests: ["pharmacology"],
      activeArea: "pharmacology",
    };
    const { currentOnboarding } = renderStudioRouter("/help-us", initialOnboarding);

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

    // Onboarding personalization remains untouched
    expect(currentOnboarding()).toEqual(initialOnboarding);

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
