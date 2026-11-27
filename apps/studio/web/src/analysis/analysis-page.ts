import { Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  collectResultPlots,
  defaultResultPlotSection,
  filterResultPlotsBySection,
  groupResultPlots,
  inferResultAssayKind,
  resultGridColumns,
  resultSectionLabel,
  visibleResultPlotSections,
  withPlotSrc,
  type ResultAssayKind,
  type ResultPlot,
  type ResultPlotSection,
} from "@lisca/analysis";
import {
  liscaDesktopBridge,
  loadLiscaAssetBytes,
  resolveLiscaAssetUrl,
  saveLiscaFile,
} from "@lisca/client/desktop";
import {
  CanvasToastStack,
  createCanvasTransientStatus,
  type CanvasToastStackOptions,
} from "@lisca/instrument";
import { AppShell } from "@lisca/ui/shell";
import { Effect, Queue, Schema, Stream } from "effect";

type CanvasStatusMessage = NonNullable<CanvasToastStackOptions["messages"]>[number];

import { toErrorMessage } from "../api/studio-port";
import { studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import { StudioAnalysisControls } from "../components/studio-analysis-controls";
import { StudioAnalysisExpert } from "../components/studio-analysis-expert";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import {
  analysisStagePlaceholder,
  StudioStagePlaceholderView,
  studioStagePlaceholderRoute,
} from "../components/studio-stage-placeholder";
import { StudioTopBar } from "../components/studio-top-bar";
import { StudioNavigationMessage, StudioNavigationProvider } from "../navigation/studio-router";
import { studioAtomsSubscription, studioRegistry } from "../state/studio-registry";
import { studioWizardAtom } from "../state/studio-store";
import {
  createStudioAnalysisPageController,
  type StudioAnalysisPageController,
} from "../state/use-studio-analysis-page";
import { AnalysisPlotGallery } from "./analysis-plot-gallery";

type AnalysisPageRuntime = {
  readonly getSnapshot: () => {
    readonly workspacePath: string | null;
    readonly analysisResultFilesCount: number;
    readonly assayId: string | null;
    readonly allPlots: ResultPlot[];
    readonly activeSection: ResultPlotSection;
    readonly sectionPlots: ResultPlot[];
    readonly visibleSections: ResultPlotSection[];
    readonly hasAnyPlots: boolean;
    readonly isSaving: boolean;
    readonly resolvingPlotUrls: boolean;
    readonly saveToast: CanvasStatusMessage[];
  };
  readonly switchSection: (section: ResultPlotSection) => void;
  readonly savePdf: () => Promise<void>;
  readonly subscribe: (listener: () => void) => () => void;
  readonly dispose: () => void;
};

function resolveAssayKind(
  assayId: string | null,
  files: ReturnType<StudioAnalysisPageController["getState"]>["analysisResultFiles"],
): ResultAssayKind {
  if (
    assayId === "killing-death-reporter" ||
    assayId === "transfection" ||
    assayId === "killing-engagement" ||
    assayId === "lnp-binding"
  ) {
    return assayId;
  }
  return inferResultAssayKind(files);
}

function createAnalysisPageRuntime(): AnalysisPageRuntime {
  let disposed = false;
  let selectedSection: ResultPlotSection = "traces";
  let isSaving = false;
  let desktopPlots: ResultPlot[] = [];
  let desktopLoading = false;
  let desktopResolveGeneration = 0;
  let lastPlotsKey = "";

  const listeners = new Set<() => void>();
  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const pageController = createStudioAnalysisPageController();
  const transientSaveMessage = createCanvasTransientStatus();
  const isDesktop = liscaDesktopBridge() !== null;

  const computePlotsWithUrls = (): ResultPlot[] => {
    const page = pageController.getState();
    const assayId = studioRegistry.get(studioWizardAtom).assayId;
    const assayKind = resolveAssayKind(assayId, page.analysisResultFiles);
    return collectResultPlots(page.analysisResultFiles, assayKind).map(withPlotSrc);
  };

  const syncDesktopPlots = () => {
    if (!isDesktop) return;
    const plots = computePlotsWithUrls();
    const key = plots.map((plot) => `${plot.title}\0${plot.src ?? ""}`).join("\n");
    if (key === lastPlotsKey) return;
    lastPlotsKey = key;
    const generation = desktopResolveGeneration + 1;
    desktopResolveGeneration = generation;
    if (plots.length === 0) {
      desktopPlots = [];
      desktopLoading = false;
      notify();
      return;
    }
    desktopLoading = true;
    notify();
    void Promise.all(
      plots.map(async (plot) =>
        // Server file URLs are origin-relative; fixtures may already carry data URLs.
        plot.src?.startsWith("/") ? { ...plot, src: await resolveLiscaAssetUrl(plot.src) } : plot,
      ),
    )
      .then((resolved) => {
        if (disposed || desktopResolveGeneration !== generation) return;
        desktopPlots = resolved;
        desktopLoading = false;
        notify();
      })
      .catch(() => {
        if (disposed || desktopResolveGeneration !== generation) return;
        desktopPlots = plots;
        desktopLoading = false;
        notify();
      });
  };

  const unsubscribePage = pageController.subscribe(() => {
    syncDesktopPlots();
    notify();
  });
  const unsubscribeWizard = studioRegistry.subscribe(studioWizardAtom, () => {
    syncDesktopPlots();
    notify();
  });
  const unsubscribeToast = transientSaveMessage.subscribe(() => notify());

  syncDesktopPlots();

  const getSnapshot = () => {
    const page = pageController.getState();
    const assayId = studioRegistry.get(studioWizardAtom).assayId;
    const plotsWithUrls = computePlotsWithUrls();
    const allPlots = isDesktop ? desktopPlots : plotsWithUrls;
    const activeSection: ResultPlotSection =
      allPlots.length === 0 || filterResultPlotsBySection(allPlots, selectedSection).length > 0
        ? selectedSection
        : defaultResultPlotSection(allPlots);
    const sectionPlots = filterResultPlotsBySection(allPlots, activeSection);
    const visibleSections = visibleResultPlotSections(allPlots);
    const hasAnyPlots = allPlots.length > 0;
    const resolvingPlotUrls = isDesktop && desktopLoading && plotsWithUrls.length > 0;
    const visibleMsg = transientSaveMessage.getVisibleStatus();
    const saveToast: CanvasStatusMessage[] = visibleMsg
      ? [
          visibleMsg.startsWith("Failed")
            ? { text: visibleMsg, tone: "error" }
            : { text: visibleMsg },
        ]
      : [];

    return {
      workspacePath: page.workspacePath,
      analysisResultFilesCount: page.analysisResultFiles.length,
      assayId,
      allPlots,
      activeSection,
      sectionPlots,
      visibleSections,
      hasAnyPlots,
      isSaving,
      resolvingPlotUrls,
      saveToast,
    };
  };

  const switchSection = (section: ResultPlotSection) => {
    const snap = getSnapshot();
    if (section === snap.activeSection || isSaving) return;
    selectedSection = section;
    notify();
  };

  const savePdf = async () => {
    const snap = getSnapshot();
    const workspacePath = snap.workspacePath?.trim();
    if (!workspacePath || isSaving || !snap.hasAnyPlots) return;
    const plotsWithUrls = computePlotsWithUrls();
    isSaving = true;
    transientSaveMessage.setStatus(null);
    notify();
    try {
      const { buildResultPdf, RESULT_PDF_FILE_NAME } = await import("./save-result-pdf");
      // Read PNG bytes from the backend URLs, not the desktop data URLs shown in the gallery.
      const loadSection = async (section: ResultPlotSection) => ({
        title: resultSectionLabel(section),
        groups: await Promise.all(
          groupResultPlots(filterResultPlotsBySection(plotsWithUrls, section)).map(
            async (group) => ({
              title: group.title,
              columns: resultGridColumns(group.plots.length, group.layout),
              plots: await Promise.all(
                group.plots.flatMap((plot, index) =>
                  plot.src
                    ? [
                        loadLiscaAssetBytes(plot.src).then((bytes) => ({
                          label: group.labels[index]!,
                          bytes,
                        })),
                      ]
                    : [],
                ),
              ),
            }),
          ),
        ),
      });
      const sections: Awaited<ReturnType<typeof loadSection>>[] = [];
      for (const section of visibleResultPlotSections(plotsWithUrls)) {
        sections.push(await loadSection(section));
      }
      const savedTo = await saveLiscaFile({
        fileName: RESULT_PDF_FILE_NAME,
        directory: `${workspacePath.replace(/[\\/]+$/, "")}/results`,
        mimeType: "application/pdf",
        filterName: "PDF",
        extensions: ["pdf"],
        bytes: await buildResultPdf(sections),
      });
      if (!disposed && savedTo) {
        const plotCount = sections
          .flatMap((section) => section.groups)
          .reduce((sum, group) => sum + group.plots.length, 0);
        transientSaveMessage.setStatus(`Saved PDF (${plotCount} plot(s)) to ${savedTo}`);
      }
    } catch (cause) {
      if (!disposed) {
        transientSaveMessage.setStatus(toErrorMessage(cause, "Failed to save PDF"));
      }
    } finally {
      if (!disposed) {
        isSaving = false;
        notify();
      }
    }
  };

  return {
    getSnapshot,
    switchSection,
    savePdf,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      desktopResolveGeneration += 1;
      unsubscribePage();
      unsubscribeWizard();
      unsubscribeToast();
      transientSaveMessage.dispose();
      pageController.dispose();
      listeners.clear();
    },
  };
}

const analysisRuntimes = new Map<string, AnalysisPageRuntime>();
let nextAnalysisInstanceSeq = 0;

function nextAnalysisInstanceId(): string {
  nextAnalysisInstanceSeq += 1;
  return `studio-analysis-${nextAnalysisInstanceSeq}`;
}

function getOrCreateAnalysisRuntime(instanceId: string): AnalysisPageRuntime {
  const existing = analysisRuntimes.get(instanceId);
  if (existing) return existing;
  const created = createAnalysisPageRuntime();
  analysisRuntimes.set(instanceId, created);
  return created;
}

function disposeAnalysisRuntime(instanceId: string): void {
  const runtime = analysisRuntimes.get(instanceId);
  if (!runtime) return;
  analysisRuntimes.delete(instanceId);
  runtime.dispose();
}

const AnalysisPageMessage = UiSchema.TaggedEnum({
  Updated: {},
  Navigate: { to: Schema.String },
  SwitchSection: { section: Schema.Any },
  SavePdf: {},
});

export const AnalysisPage = Html.component({
  name: "AnalysisPage",
  props: Schema.Struct({}),
  model: Schema.Struct({
    instanceId: Schema.String,
    version: Schema.Number,
  }),
  message: AnalysisPageMessage,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({
    instanceId: nextAnalysisInstanceId(),
    version: 0,
  }),
  update: {
    Updated: ($) => $.evolve({ version: (v) => v + 1 }),
    Navigate: ($, { to }) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to })),
    SwitchSection: ($, { section }) => {
      getOrCreateAnalysisRuntime($.model.instanceId).switchSection(section as ResultPlotSection);
      return $.evolve({ version: (v) => v + 1 });
    },
    SavePdf: ($) => {
      void getOrCreateAnalysisRuntime($.model.instanceId).savePdf();
      return $.evolve({ version: (v) => v + 1 });
    },
  },
  subscriptions: ({ model }) => [
    Subscription.make("studio-analysis-runtime", model.instanceId, (instanceId) =>
      Stream.callback<typeof AnalysisPageMessage.Type>((queue) => {
        const runtime = getOrCreateAnalysisRuntime(instanceId);
        const unsubscribe = runtime.subscribe(() => {
          Queue.offerUnsafe(queue, AnalysisPageMessage.Updated());
        });
        return Effect.addFinalizer(() =>
          Effect.sync(() => {
            unsubscribe();
            disposeAnalysisRuntime(instanceId);
          }),
        );
      }),
    ),
    studioAtomsSubscription<typeof AnalysisPageMessage.Type>(
      "studio-analysis-expert",
      [studioExpertModeAtom],
      AnalysisPageMessage.Updated(),
    ),
  ],
  view: (h, model) => {
    const runtime = getOrCreateAnalysisRuntime(model.instanceId);
    const snap = runtime.getSnapshot();
    const expertMode = studioRegistry.get(studioExpertModeAtom);

    const stagePlaceholder = snap.resolvingPlotUrls
      ? null
      : analysisStagePlaceholder({
          workspacePath: snap.workspacePath,
          hasAnyPlots: snap.hasAnyPlots,
          sectionPlotCount: snap.sectionPlots.length,
        });

    const sectionToolActions = snap.hasAnyPlots
      ? snap.visibleSections.map((section) => ({
          id: section,
          label: resultSectionLabel(section),
          disabled: snap.isSaving,
          active: snap.activeSection === section,
          onSelect: AnalysisPageMessage.SwitchSection({ section }),
        }))
      : [];

    const saveDisabled = !snap.workspacePath?.trim() || !snap.hasAnyPlots || snap.isSaving;

    const controlsOptions = {
      saveDisabled,
      saveLabel: "Save PDF",
      shortcutsEnabled: !snap.isSaving,
      toolActions: sectionToolActions,
      onSave: AnalysisPageMessage.SavePdf(),
    };

    const mainContent = stagePlaceholder
      ? StudioStagePlaceholderView(h, {
          title: stagePlaceholder.title,
          description: stagePlaceholder.description,
          actionLabel: stagePlaceholder.actionLabel,
          ...(stagePlaceholder.action !== undefined
            ? {
                onAction: AnalysisPageMessage.Navigate({
                  to: studioStagePlaceholderRoute(stagePlaceholder.action),
                }),
              }
            : {}),
        })
      : snap.sectionPlots.length > 0
        ? AppShell.MainScroll(h, {
            key: "analysis-main-scroll",
            contentClass: "relative max-w-[1200px] px-6 py-8",
            children: h.div.class("relative flex min-h-full w-full flex-1 flex-col").children(
              AnalysisPlotGallery(h, {
                pageTitle: resultSectionLabel(snap.activeSection),
                plots: snap.sectionPlots,
                section: snap.activeSection,
              }),
            ),
          })
        : undefined;

    return AppShell(h, {
      key: "analysis-shell",
      leftWidthClass: "w-rail",
      left: StudioLeft(h, { key: "studio-left" }),
      topBar: StudioTopBar(h, { key: "studio-top-bar", showExpert: true }),
      main: [CanvasToastStack(h, { messages: snap.saveToast }), mainContent],
      rightWidthClass: "w-rail",
      right: StudioRightPanel(h, {
        key: "studio-right-panel",
        expertMode,
        children: StudioAnalysisControls(h, {
          key: "analysis-controls",
          ...controlsOptions,
        }),
        expert: [
          StudioAnalysisExpert(h, {
            key: "analysis-expert",
            assayId: snap.assayId,
            fileCount: snap.analysisResultFilesCount,
          }),
          ...StudioAnalysisControls(h, {
            key: "analysis-controls-expert",
            ...controlsOptions,
          }),
        ],
      }),
    });
  },
});

export default AnalysisPage;
