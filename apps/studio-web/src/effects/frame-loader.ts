import { createAlignerFrameLoader } from "@lisca/client/frame-loader";

import { resolveStudioHttpBaseUrl } from "../api/studio-client";

const loader = createAlignerFrameLoader({
  spanName: "studio-web.load-frame",
  httpBaseUrl: resolveStudioHttpBaseUrl,
});

export const { loadFrameEffect, effectErrorMessage } = loader;
