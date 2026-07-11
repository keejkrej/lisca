import type { FrameResult } from "@lisca/utils";
import { encodeFramePayload } from "@lisca/utils";

import type { SmartSegmentProvider } from "../provider";
import type { SmartSegmentPoint } from "../types";

export type RequestSmartSegmentClient = {
  smartSegment(
    request: {
      frame: ReturnType<typeof encodeFramePayload>;
      points: SmartSegmentPoint[];
    },
    signal?: AbortSignal,
  ): Promise<{ mask: number[] }>;
};

export function createRequestSmartSegmentProvider(
  client: RequestSmartSegmentClient,
): SmartSegmentProvider {
  let preparedFrame: FrameResult | null = null;

  return {
    async prepareFrame(frame, _options) {
      preparedFrame = frame;
    },
    async segment(points) {
      if (!preparedFrame) {
        throw new Error("Smart segment frame is not prepared");
      }
      const response = await client.smartSegment({
        frame: encodeFramePayload(preparedFrame),
        points,
      });
      return Uint8Array.from(response.mask);
    },
    dispose() {
      preparedFrame = null;
    },
  };
}