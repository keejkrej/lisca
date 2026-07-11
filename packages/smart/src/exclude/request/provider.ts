import type {
  AlignerSource,
  ContrastWindow,
  FrameRequest,
  SmartExcludeRequest,
  SmartExcludeResponse,
} from "@lisca/contracts";

import type { SmartExcludeProvider } from "../provider";

export type RequestSmartExcludeContext = {
  source: () => AlignerSource | null;
  selection: () => FrameRequest;
  contrast: () => ContrastWindow | null;
};

export type RequestSmartExcludeClient = {
  smartExclude(
    request: SmartExcludeRequest,
    signal?: AbortSignal,
  ): Promise<SmartExcludeResponse>;
};

export function createRequestSmartExcludeProvider(
  client: RequestSmartExcludeClient,
  context: RequestSmartExcludeContext,
): SmartExcludeProvider {
  return {
    async classify(input, options) {
      const source = context.source();
      if (!source) {
        throw new Error("No imaging source selected");
      }
      const response = await client.smartExclude({
        source,
        request: context.selection(),
        contrast: context.contrast(),
        cells: [...input.cells],
        threshold: options?.threshold,
      });
      return response.excludedCells;
    },
  };
}