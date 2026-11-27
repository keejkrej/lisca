import { Html } from "@effect/ui/html";
import type { AnnotationLabel } from "@lisca/contracts";
import type {
  SmartSegmentContext,
  SmartSegmentController,
  SmartSegmentControllerOptions,
} from "@lisca/smart/segment";
import { ShellWorkspaceProvider } from "@lisca/ui/shell";
import type { FrameResult } from "@lisca/utils";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

type Toast = { text: string; tone?: "error" | undefined };

const mocks = vi.hoisted(() => ({
  smartOptions: null as SmartSegmentControllerOptions | null,
  lastSmartContext: null as SmartSegmentContext | null,
  smartDispose: vi.fn(),
  canvasOnMaskCommit: null as ((mask: Uint8Array) => unknown) | null,
}));

vi.mock("@lisca/client/runtime", () => ({
  runClientEffect: vi.fn(),
}));

vi.mock("@lisca/smart/segment/request", () => ({
  createRequestSmartSegmentProvider: () => ({
    prepareFrame: vi.fn(async () => undefined),
    segment: vi.fn(async () => new Uint8Array()),
    dispose: vi.fn(),
  }),
}));

vi.mock("@lisca/smart/segment", () => ({
  createSmartSegmentController: (
    options: SmartSegmentControllerOptions,
  ): SmartSegmentController => {
    mocks.smartOptions = options;
    mocks.lastSmartContext = { ...options.initialContext };
    return {
      getState: () => ({
        promptsByLabel: {},
        prompts: [],
        busy: false,
        downloadState: { open: false, requiresDownload: false, progress: 0, message: "" },
      }),
      subscribe: () => () => {},
      sync: (next) => {
        mocks.lastSmartContext = { ...next };
      },
      handleClick: vi.fn(async () => undefined),
      handleEraseClick: vi.fn(async () => undefined),
      clearPrompts: vi.fn(),
      confirmDownload: vi.fn(async () => undefined),
      cancelDownload: vi.fn(),
      dispose: mocks.smartDispose,
    };
  },
}));

vi.mock("@lisca/instrument", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lisca/instrument")>();
  return {
    ...actual,
    AnnotationCanvas: (
      h: Html.H<any>,
      options: { onMaskCommit: (mask: Uint8Array) => unknown; emptyText?: string | undefined },
    ) => {
      mocks.canvasOnMaskCommit = options.onMaskCommit;
      return h.div.attr("data-testid", "mock-annotation-canvas").children(options.emptyText ?? "");
    },
  };
});

import { AnnotatorMain } from "../src/components/annotator-main";
import { AnnotatorSaveSection } from "../src/components/annotator-save-section";
import {
  AnnotatePageProvider,
  registerAnnotateController,
} from "../src/state/annotate-page-context";
import type { AnnotateState, AnnotateStateController } from "../src/state/use-annotate-state";
import { cleanupMounted, flushMicrotasks, keyDownElement, mountTest } from "./render-helper";

function createMockController(getState: () => AnnotateState) {
  const listeners = new Set<() => void>();
  const controller: AnnotateStateController = {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncExternal() {},
    dispose() {
      listeners.clear();
    },
  };
  const registered = registerAnnotateController(controller);
  return {
    controllerId: registered.controllerId,
    notify() {
      for (const listener of listeners) listener();
    },
    dispose: registered.dispose,
  };
}

const MainTestHost = Html.component({
  name: "AnnotatorMainTestHost",
  props: Schema.Struct({ controllerId: Schema.String }),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) =>
    ShellWorkspaceProvider(h, {
      props: {},
      view: () =>
        AnnotatePageProvider(h, {
          controllerId: h.props.controllerId,
          children: AnnotatorMain(h, { props: {} }),
        }),
    }),
});

const SaveSectionTestHost = Html.component({
  name: "AnnotatorSaveSectionTestHost",
  props: Schema.Struct({ controllerId: Schema.String }),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) =>
    ShellWorkspaceProvider(h, {
      props: {},
      view: () =>
        AnnotatePageProvider(h, {
          controllerId: h.props.controllerId,
          children: AnnotatorSaveSection(h, { props: {} }),
        }),
    }),
});

afterEach(async () => {
  await cleanupMounted();
  mocks.smartOptions = null;
  mocks.lastSmartContext = null;
  mocks.canvasOnMaskCommit = null;
  vi.clearAllMocks();
});

function toastTexts(container: HTMLElement): Array<{ text: string; role: string | null }> {
  return Array.from(container.querySelectorAll('[role="status"], [role="alert"]')).map((node) => ({
    text: node.textContent?.trim() ?? "",
    role: node.getAttribute("role"),
  }));
}

describe("Annotator live component state", () => {
  it("keeps Smart Segment inputs, commits, and canvas toasts live", async () => {
    const firstFrame: FrameResult = {
      width: 2,
      height: 2,
      pixels: new Uint8Array([1, 2, 3, 4]),
    };
    const secondFrame: FrameResult = {
      width: 3,
      height: 1,
      pixels: new Uint8Array([5, 6, 7]),
    };
    let frame: FrameResult | null = firstFrame;
    let tool = "brush";
    let labels: AnnotationLabel[] = [
      { id: "cell", name: "Cell", color: "#10b981" },
      { id: "artifact", name: "Artifact", color: "#737373" },
    ];
    let activeLabelId = "cell";
    let mask = new Uint8Array([0, 0, 0, 0]);
    let canEditSegmentation = false;
    let classificationLabelId: string | null = "cell";
    let canvasToasts: Toast[] = [{ text: "Loading ROI frame" }];
    const commit = vi.fn();

    const mock = createMockController(
      () =>
        ({
          workspacePath: "/workspace",
          request: null,
          contrast: null,
          scan: null,
          scanLoading: false,
          scanError: null,
          selection: { pos: null, roi: 12, channel: 1, timeIndex: 0, zIndex: 0 },
          frame,
          labels,
          tool,
          activeLabelId,
          brushSize: 4,
          overlayOpacity: 0.35,
          annotation: {
            current: {
              classificationLabelId,
              mask,
            },
            commit,
          },
          canEditSegmentation,
          canvasToasts,
        }) as unknown as AnnotateState,
    );

    try {
      const { container } = await mountTest(MainTestHost, { controllerId: mock.controllerId });
      await flushMicrotasks();

      expect(mocks.smartOptions).not.toBeNull();
      expect(mocks.lastSmartContext).not.toBeNull();
      expect(mocks.canvasOnMaskCommit).not.toBeNull();

      expect(mocks.lastSmartContext?.frame).toBe(firstFrame);
      expect(mocks.lastSmartContext?.tool).toBe("brush");
      expect(mocks.lastSmartContext?.activeLabelValue).toBe(1);
      expect(mocks.lastSmartContext?.mask).toEqual(new Uint8Array([0, 0, 0, 0]));
      expect(mocks.lastSmartContext?.enabled).toBe(false);
      expect(toastTexts(container)).toEqual([{ text: "Loading ROI frame", role: "status" }]);

      frame = secondFrame;
      tool = "smart";
      activeLabelId = "artifact";
      mask = new Uint8Array([2, 0, 2]);
      canEditSegmentation = true;
      canvasToasts = [{ text: "Frame ready" }];
      mock.notify();
      await flushMicrotasks();

      expect(mocks.lastSmartContext?.frame).toBe(secondFrame);
      expect(mocks.lastSmartContext?.tool).toBe("smart");
      expect(mocks.lastSmartContext?.activeLabelValue).toBe(2);
      expect(mocks.lastSmartContext?.mask).toEqual(new Uint8Array([2, 0, 2]));
      expect(mocks.lastSmartContext?.enabled).toBe(true);
      expect(toastTexts(container)).toEqual([{ text: "Frame ready", role: "status" }]);

      mocks.smartOptions?.onStatus?.("Segmenting…");
      await flushMicrotasks();
      expect(toastTexts(container)).toEqual([
        { text: "Frame ready", role: "status" },
        { text: "Segmenting…", role: "status" },
      ]);

      mocks.smartOptions?.onError?.("Model unavailable");
      await flushMicrotasks();
      expect(toastTexts(container)).toEqual([{ text: "Model unavailable", role: "alert" }]);

      classificationLabelId = "artifact";
      const committedMask = new Uint8Array([2, 2, 0]);
      mocks.smartOptions?.onCommit(committedMask);
      expect(commit).toHaveBeenCalledWith({
        classificationLabelId: "artifact",
        mask: committedMask,
      });

      labels = [{ id: "background", name: "Background", color: "#171717" }];
      activeLabelId = "background";
      mock.notify();
      await flushMicrotasks();
      expect(mocks.lastSmartContext?.activeLabelValue).toBe(1);
    } finally {
      mock.dispose();
    }
  });

  it("keeps the Action rail focused on the live save action and ROI shortcuts", async () => {
    let canSave = false;
    let saving = false;
    let canGoBack = false;
    let canGoNext = true;
    const handleSave = vi.fn(async () => undefined);
    const goBack = vi.fn();
    const goNext = vi.fn();

    const mock = createMockController(
      () =>
        ({
          workspacePath: "/workspace",
          canSave,
          saving,
          canGoBack,
          canGoNext,
          handleSave,
          goBack,
          goNext,
        }) as unknown as AnnotateState,
    );

    try {
      const { container } = await mountTest(SaveSectionTestHost, {
        controllerId: mock.controllerId,
      });
      await flushMicrotasks();

      const findButton = (label: string) =>
        Array.from(container.querySelectorAll("button")).find(
          (btn) => btn.textContent?.trim() === label,
        );

      const saveBtn = findButton("Save");
      expect(saveBtn).toBeTruthy();
      expect(saveBtn?.hasAttribute("disabled")).toBe(true);
      expect(container.textContent).not.toMatch(/annotations\/roi/);

      canSave = true;
      canGoBack = true;
      mock.notify();
      await flushMicrotasks();
      expect(findButton("Save")?.hasAttribute("disabled")).toBe(false);

      keyDownElement(window, "s", { ctrlKey: true });
      await flushMicrotasks();
      expect(handleSave).toHaveBeenCalledTimes(1);

      keyDownElement(window, "ArrowLeft", { ctrlKey: true });
      keyDownElement(window, "ArrowRight", { ctrlKey: true });
      await flushMicrotasks();
      expect(goBack).toHaveBeenCalledTimes(1);
      expect(goNext).toHaveBeenCalledTimes(1);

      saving = true;
      mock.notify();
      await flushMicrotasks();
      expect(findButton("Save")).toBeTruthy();
    } finally {
      mock.dispose();
    }
  });
});
