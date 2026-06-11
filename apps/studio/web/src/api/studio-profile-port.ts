import { createProfilePort } from "@lisca/client/profile/port";
import { createLiscaPort } from "@lisca/web-app";

const port = createLiscaPort({
  defaultPort: 8767,
  env: {
    httpUrl: import.meta.env.VITE_HTTP_URL,
    wsUrl: import.meta.env.VITE_WS_URL,
    wsHost: import.meta.env.VITE_WS_HOST,
    wsPort: import.meta.env.VITE_WS_PORT,
    dev: import.meta.env.DEV,
  },
  createPort: createProfilePort,
});

export const studioProfileClient = port.ensure();
