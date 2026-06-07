import type { StudioDataPort } from "@lisca/client/ports/types";
import { createStudioPort } from "@lisca/client/ports/studio";
import { createLiscaPort, toHostFilePickerOperations } from "@lisca/web-app";

const port = createLiscaPort<StudioDataPort>({
  defaultPort: 8767,
  env: {
    httpUrl: import.meta.env.VITE_HTTP_URL,
    wsUrl: import.meta.env.VITE_WS_URL,
    wsHost: import.meta.env.VITE_WS_HOST,
    wsPort: import.meta.env.VITE_WS_PORT,
    dev: import.meta.env.DEV,
  },
  createPort: createStudioPort,
});

export const studioPortRegistry = port.registry;

export const readStudioPort = port.read;
export const ensureStudioPort = port.ensure;
export const setStudioPortForTests = port.setForTests;
export const resetStudioPortForTests = port.resetForTests;

export const resolveStudioHttpBaseUrl = port.httpBaseUrl;
export const resolveStudioWsUrl = port.wsUrl;
export const toErrorMessage = port.toErrorMessage;

/** Primary studio API for app code. */
export const studioClient = port.ensure();

/** Promise-based host operations for `@lisca/ui` file pickers. */
export const studioHostOperations = toHostFilePickerOperations(studioClient);
