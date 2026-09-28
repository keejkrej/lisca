import { createAlignerFrameLoader } from "@lisca/client/frame-loader";

const loader = createAlignerFrameLoader({
  spanName: "aligner-web.load-frame",
});

export const { loadFrameEffect, effectErrorMessage } = loader;
