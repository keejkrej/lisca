import type {
  ContrastWindow,
  RoiFrameRequest,
  SmartSegmentRequest,
  SmartSegmentResponse,
} from "@lisca/contracts";

import type { SmartSegmentProvider } from "../provider";
import type { SmartSegmentPoint } from "../types";

export type RequestSmartSegmentContext = {
  workspacePath: () => string | null;
  roiRequest: () => RoiFrameRequest | null;
  contrast: () => ContrastWindow | null;
};

export type RequestSmartSegmentClient = {
  smartSegment(request: SmartSegmentRequest, signal?: AbortSignal): Promise<SmartSegmentResponse>;
};

export function createRequestSmartSegmentProvider(
  client: RequestSmartSegmentClient,
  context: RequestSmartSegmentContext,
): SmartSegmentProvider {
  return {
    async prepareFrame() {
      // Server-backed segmentation loads the ROI frame on demand.
    },
    async segment(points: SmartSegmentPoint[]) {
      const workspacePath = context.workspacePath();
      const request = context.roiRequest();
      if (!workspacePath || !request) {
        throw new Error("ROI frame is not selected");
      }
      const response = await client.smartSegment({
        workspacePath,
        request,
        contrast: context.contrast(),
        points,
      });
      return Uint8Array.from(response.mask);
    },
    dispose() {},
  };
}
