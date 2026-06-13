import { createAlignerFrameLoader } from "@lisca/client/frame-loader";

import { resolveStudioHttpBaseUrl } from "../api/studio-port";

const loader = createAlignerFrameLoader({
  spanName: "studio.load-frame",
  httpBaseUrl: resolveStudioHttpBaseUrl,
});

export const { loadFrameEffect, effectErrorMessage } = loader;
