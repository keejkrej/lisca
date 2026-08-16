import { cleanup, render, screen } from "@solidjs/testing-library";
import type { AnnotationLabel } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

type Toast = { text: string; tone?: "error" };

type SmartSegmentOptions = {
  frame: FrameResult | null;
  tool: string;
  activeLabelValue: number;
  mask: Uint8Array;
  enabled: boolean;
  onCommit: (mask: Uint8Array) => void;
  onStatus?: (status: string | null) => void;
  onError?: (error: string | null) => void;
};

type AnnotationCanvasProps = {
  toasts: readonly Toast[];
  onMaskCommit: (mask: Uint8Array) => void;
};

const mocks = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  canvas: {} as Record<string, unknown>,
  nav: {} as Record<string, unknown>,
  dock: {} as Record<string, unknown>,
  smartSegmentOptions: null as SmartSegmentOptions | null,
  annotationCanvasProps: null as AnnotationCanvasProps | null,
}));

vi.mock("@lisca/client/runtime", () => ({
  runClientEffect: vi.fn(),
}));

vi.mock("@lisca/smart/segment/request", () => ({
  createRequestSmartSegmentProvider: () => ({}),
}));

vi.mock("@lisca/smart/segment", () => ({
  useSmartSegment: (options: SmartSegmentOptions) => {
    mocks.smartSegmentOptions = options;
    return {
      busy: () => false,
      prompts: () => [],
      handleClick: vi.fn(),
      handleEraseClick: vi.fn(),
    };
  },
}));

vi.mock("@lisca/ui/features", () => ({
  AnnotationCanvas: (props: AnnotationCanvasProps) => {
    mocks.annotationCanvasProps = props;
    return null;
  },
}));

vi.mock("../src/api/annotator-port", () => ({
  annotatorClient: {
    smartSegment: vi.fn(),
  },
}));

vi.mock("../src/state/annotate-page-context", () => ({
  useAnnotatePage: () => ({ state: mocks.state }),
}));

vi.mock("../src/state/annotate-page-selectors", () => ({
  useAnnotateCanvas: () => mocks.canvas,
  useAnnotateNav: () => mocks.nav,
  useAnnotateDock: () => mocks.dock,
}));

import { AnnotatorMain } from "../src/components/annotator-main";
import { AnnotatorSaveSection } from "../src/components/annotator-save-section";

afterEach(() => {
  cleanup();
  mocks.smartSegmentOptions = null;
  mocks.annotationCanvasProps = null;
  vi.clearAllMocks();
});

describe("Annotator live component state", () => {
  it("keeps Smart Segment inputs, commits, and canvas toasts live", () => {
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
    const [frame, setFrame] = createSignal<FrameResult | null>(firstFrame);
    const [tool, setTool] = createSignal("brush");
    const [labels, setLabels] = createSignal<AnnotationLabel[]>([
      { id: "cell", name: "Cell", color: "#10b981" },
      { id: "artifact", name: "Artifact", color: "#737373" },
    ]);
    const [activeLabelId, setActiveLabelId] = createSignal("cell");
    const [mask, setMask] = createSignal(new Uint8Array([0, 0, 0, 0]));
    const [canEditSegmentation, setCanEditSegmentation] = createSignal(false);
    const [classificationLabelId, setClassificationLabelId] = createSignal<string | null>("cell");
    const [canvasToasts, setCanvasToasts] = createSignal<Toast[]>([{ text: "Loading ROI frame" }]);
    const commit = vi.fn();
    const annotation = {
      get current() {
        return {
          classificationLabelId: classificationLabelId(),
          mask: mask(),
        };
      },
      commit,
    };

    mocks.state = {
      workspacePath: "/workspace",
      request: null,
      contrast: null,
    };
    mocks.canvas = {
      get frame() {
        return frame();
      },
      get labels() {
        return labels();
      },
      get tool() {
        return tool();
      },
      get activeLabelId() {
        return activeLabelId();
      },
      brushSize: 4,
      overlayOpacity: 0.35,
      annotation,
      get canEditSegmentation() {
        return canEditSegmentation();
      },
      get canvasToasts() {
        return canvasToasts();
      },
    };
    mocks.nav = {
      selection: { roi: 12, channel: 1 },
    };

    render(() => <AnnotatorMain />);

    const options = mocks.smartSegmentOptions;
    const canvasProps = mocks.annotationCanvasProps;
    expect(options).not.toBeNull();
    expect(canvasProps).not.toBeNull();
    if (!options || !canvasProps) throw new Error("Annotator component mocks were not captured");

    expect(options.frame).toBe(firstFrame);
    expect(options.tool).toBe("brush");
    expect(options.activeLabelValue).toBe(1);
    expect(options.mask).toEqual(new Uint8Array([0, 0, 0, 0]));
    expect(options.enabled).toBe(false);
    expect(canvasProps.toasts).toEqual([{ text: "Loading ROI frame" }]);

    setFrame(secondFrame);
    setTool("smart");
    setActiveLabelId("artifact");
    setMask(new Uint8Array([2, 0, 2]));
    setCanEditSegmentation(true);
    setCanvasToasts([{ text: "Frame ready" }]);

    expect(options.frame).toBe(secondFrame);
    expect(options.tool).toBe("smart");
    expect(options.activeLabelValue).toBe(2);
    expect(options.mask).toEqual(new Uint8Array([2, 0, 2]));
    expect(options.enabled).toBe(true);
    expect(canvasProps.toasts).toEqual([{ text: "Frame ready" }]);

    options.onStatus?.("Segmenting…");
    expect(canvasProps.toasts).toEqual([{ text: "Frame ready" }, { text: "Segmenting…" }]);
    options.onError?.("Model unavailable");
    expect(canvasProps.toasts).toEqual([{ text: "Model unavailable", tone: "error" }]);

    setClassificationLabelId("artifact");
    const committedMask = new Uint8Array([2, 2, 0]);
    options.onCommit(committedMask);
    expect(commit).toHaveBeenCalledWith({
      classificationLabelId: "artifact",
      mask: committedMask,
    });

    setLabels([{ id: "background", name: "Background", color: "#171717" }]);
    setActiveLabelId("background");
    expect(options.activeLabelValue).toBe(1);
  });

  it("keeps the Action rail focused on the live save action", () => {
    const [saving, setSaving] = createSignal(false);
    mocks.dock = {
      canSave: false,
      get saving() {
        return saving();
      },
      handleSave: vi.fn(),
    };

    render(() => <AnnotatorSaveSection />);

    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.queryByText(/annotations\/roi/)).toBeNull();

    setSaving(true);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeTruthy();
  });
});
