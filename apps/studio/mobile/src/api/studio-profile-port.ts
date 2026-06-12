import { createProfilePort } from "@lisca/client/profile/port";
import { readStudioProfileAccessToken } from "@lisca/client/profile/session";
import type { LiscaPortDeps } from "@lisca/client/port-core";
import { createLiscaMobilePort } from "@lisca/mobile-app";

function createStudioProfilePort(deps: LiscaPortDeps) {
  return createProfilePort({
    baseUrl: deps.baseUrl,
    accessToken: readStudioProfileAccessToken,
  });
}

const port = createLiscaMobilePort({
  defaultPort: 8767,
  createPort: createStudioProfilePort,
});

export const studioProfileClient = port.ensure();
