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
  workspacePath?: () => string | null;
};

export type RequestSmartExcludeClient = {
  smartExclude(request: SmartExcludeRequest, signal?: AbortSignal): Promise<SmartExcludeResponse>;
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
      const workspacePath = input.workspacePath ?? context.workspacePath?.() ?? undefined;
      const response = await client.smartExclude({
        source,
        request: context.selection(),
        contrast: context.contrast(),
        cells: [...input.cells],
        threshold: options?.threshold,
        workspacePath: workspacePath ?? undefined,
        persistPromptPack: input.persistPromptPack,
        appendPromptExamples: input.appendPromptExamples,
        promptExamples: input.promptExamples,
        promptPack: input.promptPack,
      });
      options?.onOccupancy?.({
        engine: response.engine,
        packReady: response.packReady,
        occupiedCount: response.occupiedCount,
        emptyCount: response.emptyCount,
        message: response.message,
      });
      return response.excludedCells;
    },
  };
}
