import { createAlignerFrameLoader } from "@lisca/client/frame-loader";

import { resolveAlignerHttpBaseUrl } from "../api/aligner-port";

const loader = createAlignerFrameLoader({
  spanName: "aligner-mobile.load-frame",
  httpBaseUrl: resolveAlignerHttpBaseUrl,
});

export const { loadFrameEffect, effectErrorMessage } = loader;
