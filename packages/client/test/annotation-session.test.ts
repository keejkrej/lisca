import type { RoiFrameRequest, RoiPositionScan } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  AnnotationHistory,
  annotationOutputPaths,
  createRoiFrameLoader,
  makeRoiFrameRequest,
} from "../src/session/annotation-session";

const roi = {
  roi: 4,
  fileName: "roi.tif",
  bbox: { x: 0, y: 0, width: 2, height: 2 },
  shape: [2, 2, 1, 1, 1] as [number, number, number, number, number],
};

const position: RoiPositionScan = {
  pos: 2,
  source: { kind: "nd2", path: "/data/source.nd2" },
  channels: [1],
  times: [10, 20],
  zSlices: [3, 5],
  rois: [roi],
};

const request: RoiFrameRequest = {
  pos: 2,
  roi: 4,
  channel: 1,
  time: 20,
  z: 3,
};

const frame: FrameResult = {
  width: 2,
  height: 2,
  pixels: new Uint8Array([0, 1, 2, 3]),
  contrastDomain: { min: 0, max: 255 },
  suggestedContrast: { min: 0, max: 3 },
};

describe("annotation session value history", () => {
  it("clones commits and drops the redo branch", () => {
    const history = new AnnotationHistory({
      classificationLabelId: null,
      mask: new Uint8Array([0, 0]),
    });
    const first = {
      classificationLabelId: "alive",
      mask: new Uint8Array([1, 0]),
    };
    history.commit(first);
    first.mask[0] = 9;

    expect(history.current.mask[0]).toBe(1);
    expect(history.dirty).toBe(true);
    history.undo();
    expect(history.canRedo).toBe(true);
    history.commit({
      classificationLabelId: "dead",
      mask: new Uint8Array([0, 1]),
    });
    expect(history.canRedo).toBe(false);

    history.markSaved();
    expect(history.dirty).toBe(false);
  });

  it("discards edits back to an isolated saved value", () => {
    const initial = {
      classificationLabelId: "alive",
      mask: new Uint8Array([1]),
    };
    const history = new AnnotationHistory(initial);
    initial.mask[0] = 0;
    history.commit({ classificationLabelId: "dead", mask: new Uint8Array([2]) });
    history.discard();

    expect(history.current.classificationLabelId).toBe("alive");
    expect(history.current.mask[0]).toBe(1);
    expect(history.dirty).toBe(false);
  });
});

describe("annotation session request and output policy", () => {
  it("resolves indexed time and z values into an ROI request", () => {
    expect(makeRoiFrameRequest(position, roi, 1, 1, 0)).toEqual(request);
    expect(makeRoiFrameRequest(position, roi, 1, 3, 0)).toBeNull();
  });

  it("builds both annotation artifact paths", () => {
    expect(annotationOutputPaths(request)).toEqual([
      "annotations/roi/Pos2/Roi4/C1_T20_Z3.json",
      "annotations/roi/Pos2/Roi4/C1_T20_Z3.png",
    ]);
  });
});

describe("ROI frame loader", () => {
  it("normalizes and caches frames by workspace, request, and contrast", async () => {
    let loadCount = 0;
    const port = {
      loadRoiFrame: () => {
        loadCount += 1;
        return Effect.succeed(frame);
      },
    };
    const loader = createRoiFrameLoader(1);

    await Effect.runPromise(loader.loadFrame(port, "/workspace", request, null));
    await Effect.runPromise(loader.loadFrame(port, "/workspace", request, null));
    expect(loadCount).toBe(1);

    const nextRequest = { ...request, time: 10 };
    await Effect.runPromise(loader.loadFrame(port, "/workspace", nextRequest, null));
    await Effect.runPromise(loader.loadFrame(port, "/workspace", request, null));
    expect(loadCount).toBe(3);
  });

  it("loads an empty mask without invoking the browser codec", async () => {
    const loader = createRoiFrameLoader();
    const result = await Effect.runPromise(
      loader.loadFrameWithAnnotation(
        {
          loadRoiFrame: () => Effect.succeed(frame),
          loadRoiFrameAnnotation: () =>
            Effect.succeed({
              annotation: {
                classificationLabelId: "alive",
                maskPath: null,
                updatedAt: null,
              },
              maskBase64Png: null,
            }),
        },
        "/workspace",
        request,
        null,
      ),
    );

    expect(result.annotation.classificationLabelId).toBe("alive");
    expect(result.annotation.mask).toEqual(new Uint8Array(4));
  });
});
