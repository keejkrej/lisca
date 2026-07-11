import { runClientEffect } from "@lisca/client/runtime";
import { createRequestSmartExcludeProvider } from "@lisca/smart/exclude/request";

import { studioClient } from "../api/studio-port";

export const studioSmartExcludeProvider = createRequestSmartExcludeProvider({
  smartExclude: (request, signal) =>
    runClientEffect(studioClient.smartExclude(request, signal), signal ? { signal } : undefined),
});