import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";

import { createFrameViewController } from "../src/frame-view-controller";

describe("createFrameViewController", () => {
  it("preserves view state for same-sized frames and resets when dimensions change", () => {
    createRoot((dispose) => {
      const controller = createFrameViewController();
      controller.syncFrame({ width: 100, height: 100 });
      controller.zoomAtCenter(2, 100, 100, { width: 100, height: 100 });
      expect(controller.view().zoom).toBe(2);

      controller.syncFrame({ width: 100, height: 100 });
      expect(controller.view().zoom).toBe(2);

      controller.syncFrame({ width: 200, height: 100 });
      expect(controller.view()).toEqual({ zoom: 1, centerX: 100, centerY: 50 });
      dispose();
    });
  });

  it("uses the normalized viewport center after a resize", () => {
    createRoot((dispose) => {
      const controller = createFrameViewController();
      const frame = { width: 100, height: 100 };
      controller.syncFrame(frame);
      controller.zoomAtFramePoint(2, { x: 75, y: 50 }, 100, 100, frame);
      expect(controller.view().centerX).toBeGreaterThan(50);

      controller.zoomAtCenter(2, 400, 100, frame);
      expect(controller.view().zoom).toBe(4);
      expect(controller.view().centerX).toBe(50);
      expect(controller.view().centerY).toBe(50);
      dispose();
    });
  });
});
