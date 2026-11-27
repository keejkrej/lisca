import { Router } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  HostFilePickerPort,
  LabelFreeClientPort,
  TaskCenterPort,
  type TaskCenterServiceShape,
} from "@lisca/instrument";
import {
  ShellServerProbe,
  ShellServerProvider,
  ShellThemeProvider,
  ShellWorkspaceProvider,
} from "@lisca/ui/shell";
import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { Layer, Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mockFlag = vi.hoisted(() => ({
  assayPath: null as string | null,
}));

vi.mock("../src/api/studio-mock", () => ({
  studioMockAssayPath: () => mockFlag.assayPath,
}));

import { StudioMetadataLeaveGuard } from "../src/components/studio-metadata-leave-guard";
import { StudioWorkSessionGate } from "../src/components/studio-work-session-gate";
import {
  StudioNavigationProvider,
  StudioRoute,
  studioPathForRoute,
  studioRouteForPath,
} from "../src/navigation/studio-router";
import { AlignPage } from "../src/routes/align";
import { AnalysisPage } from "../src/routes/analysis";
import { AnnotatePage } from "../src/routes/annotate";
import { AssayPage } from "../src/routes/assay";
import { HelpUsPage } from "../src/routes/help-us";
import { MetadataPage } from "../src/routes/metadata";
import { OnboardingPage } from "../src/routes/onboarding";
import {
  buildStudioFeedbackIssueUrl,
  formatStudioFeedbackMarkdown,
  readStudioFeedbackDraft,
} from "../src/state/studio-onboarding";
import { resetStudioRegistry, studioRegistry } from "../src/state/studio-registry";
import {
  createInitialStudioWizardState,
  studioWizardAtom,
  type AssayId,
} from "../src/state/studio-store";
import {
  cleanupMounted,
  clickElement,
  mountTest,
  setInputValue,
  waitForCondition,
} from "./render-helper";

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

const stubTaskCenter: TaskCenterServiceShape = {
  gateway: {
    listTasks: async () => [],
    getTask: async () => {
      throw new Error("unused in test");
    },
    getStep: async () => {
      throw new Error("unused in test");
    },
    cancelTask: async () => {
      throw new Error("unused in test");
    },
    dismissTask: async () => {
      throw new Error("unused in test");
    },
    cancelStep: async () => {
      throw new Error("unused in test");
    },
    retryStep: async () => {
      throw new Error("unused in test");
    },
  },
  subscribe: ({ onSnapshot }) => {
    onSnapshot([]);
    return () => undefined;
  },
};

let testStorage: LiscaStorageAdapter;
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

beforeEach(() => {
  mockFlag.assayPath = null;
  testStorage = createMemoryStorage();
  configureLiscaStorage({ local: testStorage, session: createMemoryStorage() });
  resetStudioRegistry();
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

afterEach(async () => {
  await cleanupMounted();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function queryGroup(container: HTMLElement, name: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[role="group"][aria-label="${name}"]`);
}

function queryButtons(root: ParentNode): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
}

function findButtonByText(root: ParentNode, match: string | RegExp): HTMLButtonElement | undefined {
  return queryButtons(root).find((button) => {
    const text = (button.textContent ?? "").trim();
    const aria = (button.getAttribute("aria-label") ?? "").trim();
    if (typeof match === "string") {
      return text === match || aria === match;
    }
    return match.test(text) || match.test(aria);
  });
}

function findHeadingByText(root: ParentNode, text: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")).find(
    (el) => (el.textContent ?? "").trim() === text,
  );
}

function findControlByLabel(
  container: HTMLElement,
  labelText: string,
): HTMLInputElement | HTMLTextAreaElement {
  const label = Array.from(container.querySelectorAll<HTMLLabelElement>("label")).find(
    (el) => (el.textContent ?? "").trim() === labelText,
  );
  if (!label) {
    throw new Error(`Label "${labelText}" not found`);
  }
  const forId = label.getAttribute("for");
  if (!forId) {
    throw new Error(`Label "${labelText}" missing for attribute`);
  }
  const control = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${forId}`);
  if (!control) {
    throw new Error(`Control #${forId} not found`);
  }
  return control;
}

async function renderStudioRouter(
  initialEntry = "/",
  initialWizard = createInitialStudioWizardState(),
) {
  studioRegistry.set(studioWizardAtom, initialWizard);
  const initialRoute = studioRouteForPath(initialEntry.split("?")[0] ?? "/");
  let currentPath: string = studioPathForRoute(initialRoute);

  const Host = Html.component({
    name: "StudioOnboardingTestHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Schema.Never,
  }).make({
    init: () => ({}),
    update: {},
    view: (h) =>
      ShellThemeProvider(h, {
        props: { storageKey: "studio-test-theme" },
        view: () =>
          ShellServerProvider(h, {
            props: {},
            view: () =>
              ShellWorkspaceProvider(h, {
                props: {},
                view: () =>
                  StudioNavigationProvider(h, {
                    key: "studio-navigation",
                    props: { initialRoute },
                    view: (nav) => {
                      currentPath = nav.pathname;
                      return StudioWorkSessionGate(h, {
                        key: "studio-work-session",
                        children: [
                          StudioMetadataLeaveGuard(h, { key: "studio-metadata-leave-guard" }),
                          (() => {
                            switch (nav.route._tag) {
                              case "Onboarding":
                                return OnboardingPage(h, { key: "page-onboarding", props: {} });
                              case "Metadata":
                                return MetadataPage(h, { key: "page-metadata", props: {} });
                              case "Align":
                                return AlignPage(h, { key: "page-align", props: {} });
                              case "Annotate":
                                return AnnotatePage(h, { key: "page-annotate", props: {} });
                              case "Analysis":
                                return AnalysisPage(h, { key: "page-analysis", props: {} });
                              case "HelpUs":
                                return HelpUsPage(h, { key: "page-help-us", props: {} });
                              case "Assay":
                              case "NotFound":
                              default:
                                return AssayPage(h, { key: "page-assay", props: {} });
                            }
                          })(),
                        ],
                      });
                    },
                  }),
              }),
          }),
      }),
  });

  const layer = Layer.mergeAll(
    Router.memory({ routes: StudioRoute, url: initialEntry }),
    Layer.succeed(ShellServerProbe, () => Promise.resolve("ok")),
    Layer.succeed(TaskCenterPort, stubTaskCenter),
    Layer.succeed(HostFilePickerPort, null),
    Layer.succeed(LabelFreeClientPort, null),
  );

  const mounted = await mountTest(Host as any, {}, { layer: layer as any });

  return {
    container: mounted.container,
    pathname: () => currentPath,
    currentAssayId: (): AssayId | null => studioRegistry.get(studioWizardAtom).assayId,
  };
}

async function expectLnpAssays(container: HTMLElement) {
  const group = await waitForCondition(() => queryGroup(container, "Assay type"));
  expect(findButtonByText(group, /LNP binding/)).toBeTruthy();
  expect(findButtonByText(group, /LNP transfection/)).toBeTruthy();
  expect(
    queryButtons(group)
      .slice(0, 2)
      .map((button) => button.textContent),
  ).toEqual([expect.stringContaining("LNP transfection"), expect.stringContaining("LNP binding")]);
  expect(findButtonByText(group, /Killing/)).toBeUndefined();
}

describe("Studio optional research guide", () => {
  it("filters workflows by field without saving interests or changing an edited assay, and resets on return", async () => {
    const { container, pathname, currentAssayId } = await renderStudioRouter("/assay", {
      ...createInitialStudioWizardState(),
      assayId: "transfection",
      name: "Already edited transfection",
    });
    await expectLnpAssays(container);
    const fields = queryGroup(container, "Research field")!;
    expect(queryButtons(fields)).toHaveLength(2);
    expect(findButtonByText(fields, "All assays")).toBeUndefined();
    clickElement(findButtonByText(fields, "LNP delivery")!);
    const assays = queryGroup(container, "Assay type")!;
    expect(findButtonByText(assays, /LNP binding/)).toBeTruthy();
    expect(findButtonByText(assays, /LNP transfection/)).toBeTruthy();
    expect(queryButtons(assays).map((button) => button.textContent)).toEqual([
      expect.stringContaining("LNP transfection"),
      expect.stringContaining("LNP binding"),
    ]);
    expect(findButtonByText(assays, /Killing/)).toBeUndefined();

    clickElement(findButtonByText(fields, "Cell killing")!);
    await waitForCondition(() => findButtonByText(assays, /Killing \(death reporter\)/));
    expect(findButtonByText(assays, /Killing \(death reporter\)/)).toBeTruthy();
    expect(findButtonByText(assays, /Killing \(label-free\)/)).toBeTruthy();
    expect(findButtonByText(assays, /LNP binding/)).toBeUndefined();
    expect(findButtonByText(assays, /Killing \(engagement\)/)).toBeTruthy();
    expect(currentAssayId()).toBe("transfection");
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();

    const guide = findButtonByText(container, "Research guide")!;
    expect(
      guide.parentElement?.contains(findButtonByText(container, "Help us improve LiSCA")!),
    ).toBe(true);
    const exactResearchNodes = Array.from(container.querySelectorAll("*")).filter(
      (el) => el.childNodes.length === 1 && el.textContent === "Research",
    );
    expect(exactResearchNodes).toHaveLength(0);

    clickElement(guide);
    await waitForCondition(() => findHeadingByText(container, "How LiSCA can help your research"));

    const continueButtons = queryButtons(container).filter(
      (b) => (b.textContent ?? "").trim() === "Continue to Assay",
    );
    expect(continueButtons.length).toBeGreaterThan(0);
    clickElement(continueButtons[0]!);
    await waitForCondition(() => pathname() === "/assay");
    await expectLnpAssays(container);
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
    const { container, pathname } = await renderStudioRouter("/");
    await expectLnpAssays(container);
    expect(pathname()).toBe("/assay");
    expect(queryGroup(container, "Research area")).toBeNull();
    expect(findButtonByText(container, /Research interests/i)).toBeUndefined();
    expect(findButtonByText(container, /Change research interests/)).toBeUndefined();
    expect(testStorage.getItem("lisca-studio-onboarding")).toBe(legacyProfile);
    clickElement(findButtonByText(container, "Research guide")!);
    await waitForCondition(() => findHeadingByText(container, "How LiSCA can help your research"));
  });

  it("opens the field of an existing killing assay without storing a field preference", async () => {
    const { container } = await renderStudioRouter("/assay", {
      ...createInitialStudioWizardState(),
      assayId: "killing-engagement",
      name: "Existing killing assay",
    });
    const fields = await waitForCondition(() => queryGroup(container, "Research field"));
    expect(findButtonByText(fields, "Cell killing")?.getAttribute("aria-pressed")).toBe("true");
    const assays = queryGroup(container, "Assay type")!;
    expect(findButtonByText(assays, /Killing \(engagement\)/)?.getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(findButtonByText(assays, /LNP/)).toBeUndefined();
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();
  });

  it("browses every research area without saving interests or changing the selected assay", async () => {
    const { container, pathname, currentAssayId } = await renderStudioRouter("/onboarding");
    await waitForCondition(() => findHeadingByText(container, "How LiSCA can help your research"));
    const originalAssay = currentAssayId();
    expect(queryGroup(container, "Research interests")).toBeNull();
    const text = container.textContent ?? "";
    expect(text).toMatch(/Neither measurement alone establishes uptake or endosomal escape/);

    const imgs = Array.from(container.querySelectorAll('[role="img"]')).map(
      (el) => el.getAttribute("aria-label") ?? "",
    );
    expect(
      imgs.some((label) => /Sample LNP binding plot showing cumulative spots per ROI/.test(label)),
    ).toBe(true);
    expect(
      imgs.some((label) =>
        /Sample transfection plot showing background-corrected GFP fluorescence traces/.test(label),
      ),
    ).toBe(true);
    expect(imgs.some((label) => /Sample pharmacology survival curve/.test(label))).toBe(true);

    expect(text).toContain("Targeted LNP");
    expect(text).toMatch(/Schnitzbauer et al\./);
    expect(text).toMatch(/Müller et al\. \(2024\)/);
    expect(text).toMatch(/One Workspace from microscope acquisition to figures/);

    const continueButtons = queryButtons(container).filter(
      (b) => (b.textContent ?? "").trim() === "Continue to Assay",
    );
    clickElement(continueButtons[0]!);
    await waitForCondition(() => pathname() === "/assay");
    await expectLnpAssays(container);
    expect(currentAssayId()).toBe(originalAssay);
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();
  });

  it("selects an explicitly requested assay in its field without saving a profile", async () => {
    const { container, pathname, currentAssayId } = await renderStudioRouter("/onboarding");
    const useBinding = await waitForCondition(() => findButtonByText(container, "Use LNP binding"));
    clickElement(useBinding);
    await waitForCondition(() => pathname() === "/assay");
    await expectLnpAssays(container);
    expect(currentAssayId()).toBe("lnp-binding");
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();
  });

  it("preserves an edited assay when browsing the guide and choosing another workflow", async () => {
    const { container, pathname, currentAssayId } = await renderStudioRouter("/onboarding", {
      ...createInitialStudioWizardState(),
      assayId: "transfection",
      name: "Already edited transfection",
    });
    const useBinding = await waitForCondition(() => findButtonByText(container, "Use LNP binding"));
    clickElement(useBinding);
    await waitForCondition(() => pathname() === "/assay");
    expect(currentAssayId()).toBe("transfection");
    await expectLnpAssays(container);
    expect(testStorage.getItem("lisca-studio-onboarding")).toBeNull();
  });
});

describe("Help us improve LiSCA page", () => {
  it("saves optional feedback drafts without creating a research profile and formats GitHub issues", async () => {
    const { container } = await renderStudioRouter("/help-us");

    await waitForCondition(() => findHeadingByText(container, "Help us improve LiSCA"));

    setInputValue(
      findControlByLabel(container, "What do you study?"),
      "3D tumor spheroids in microwells",
    );
    setInputValue(
      findControlByLabel(container, "What do you need to measure?"),
      "Radial caspase-3 activation wave speed",
    );
    setInputValue(
      findControlByLabel(container, "What is missing in LiSCA?"),
      "Z-stack maximum intensity projection during crop",
    );
    setInputValue(findControlByLabel(container, "Lab or contact (optional)"), "@spheroid-lab");

    const saveButtons = queryButtons(container).filter(
      (b) => (b.textContent ?? "").trim() === "Save",
    );
    expect(saveButtons.length).toBeGreaterThan(0);
    clickElement(saveButtons[0]!);

    const saved = await waitForCondition(() => {
      const draft = readStudioFeedbackDraft();
      return draft.updatedAt !== null ? draft : null;
    });
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
