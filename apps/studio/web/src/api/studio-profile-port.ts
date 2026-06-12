import { createProfilePort } from "@lisca/client/profile/port";
import { readStudioProfileAccessToken } from "@lisca/client/profile/session";
import { createLiscaPort, type LiscaPortDeps } from "@lisca/web-app";

function createStudioProfilePort(deps: LiscaPortDeps) {
  return createProfilePort({
    baseUrl: deps.baseUrl,
    accessToken: readStudioProfileAccessToken,
  });
}

const port = createLiscaPort({
  defaultPort: 8767,
  env: {
    httpUrl: import.meta.env.VITE_HTTP_URL,
    wsUrl: import.meta.env.VITE_WS_URL,
    wsHost: import.meta.env.VITE_WS_HOST,
    wsPort: import.meta.env.VITE_WS_PORT,
    dev: import.meta.env.DEV,
  },
  createPort: createStudioProfilePort,
});

export const studioProfileClient = port.ensure();
