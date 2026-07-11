import type { SmartExcludeRequest, SmartExcludeResponse } from "@lisca/contracts";
import { encodeFramePayload } from "@lisca/utils";

import type { SmartExcludeProvider } from "../provider";

export type RequestSmartExcludeClient = {
  smartExclude(
    request: SmartExcludeRequest,
    signal?: AbortSignal,
  ): Promise<SmartExcludeResponse>;
};

export function createRequestSmartExcludeProvider(
  client: RequestSmartExcludeClient,
): SmartExcludeProvider {
  return {
    async classify(input, options) {
      const response = await client.smartExclude({
        frame: encodeFramePayload(input.frame),
        cells: [...input.cells],
        threshold: options?.threshold,
      });
      return response.excludedCells;
    },
  };
}