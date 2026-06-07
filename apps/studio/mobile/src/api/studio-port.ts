import type { StudioDataPort } from "@lisca/client/ports/types";
import { createStudioPort } from "@lisca/client/ports/studio";
import { createLiscaMobilePort, toHostFilePickerOperations } from "@lisca/mobile-app";

const port = createLiscaMobilePort<StudioDataPort>({
  defaultPort: 8767,
  createPort: createStudioPort,
});

export const ensureStudioPort = port.ensure;
export const resolveStudioHttpBaseUrl = port.httpBaseUrl;
export const toErrorMessage = port.toErrorMessage;
export const studioClient = port.ensure();
export const studioHostOperations = toHostFilePickerOperations(studioClient);
