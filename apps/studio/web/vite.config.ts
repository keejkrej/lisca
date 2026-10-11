import { createRequire } from "node:module";

import { createLiscaViteConfig } from "@lisca/web-app/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const require = createRequire(import.meta.url);
const { LISCA_APP_PORTS } = require("../../../scripts/lisca-dev-ports.cjs") as {
  LISCA_APP_PORTS: {
    studio: { publicPort: number; backendPort: number };
    studioMock: { publicPort: number; backendPort: number };
  };
};

/** `vite --mode mock` (`pnpm run dev:studio-mock`) pins the mock ports and opens the browser. */
export default ({ mode }: { mode: string }) => {
  const mock = mode === "mock";
  const ports = mock ? LISCA_APP_PORTS.studioMock : LISCA_APP_PORTS.studio;
  return createLiscaViteConfig({
    product: "studio",
    port: ports.publicPort,
    backendPort: ports.backendPort,
    strictPort: mock,
    open: mock,
    plugins: [tanstackRouter({ target: "solid", autoCodeSplitting: true })],
  });
};
