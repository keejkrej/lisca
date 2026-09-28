import { createAlignerFrameLoader } from "@lisca/client/frame-loader";

const loader = createAlignerFrameLoader({
  spanName: "studio-web.load-frame",
});

export const { loadFrameEffect, effectErrorMessage } = loader;
