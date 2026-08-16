import { runClientEffect } from "@lisca/client/runtime";
import {
  createRequestSmartExcludeProvider,
  type RequestSmartExcludeContext,
} from "@lisca/smart/exclude/request";

import { studioClient } from "../api/studio-port";

export function createStudioSmartExcludeProvider(context: RequestSmartExcludeContext) {
  return createRequestSmartExcludeProvider(
    {
      smartExclude: (request, signal) =>
        runClientEffect(
          studioClient.smartExclude(request, signal),
          signal ? { signal } : undefined,
        ),
    },
    context,
  );
}
