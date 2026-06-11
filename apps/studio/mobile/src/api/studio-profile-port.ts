import { createProfilePort } from "@lisca/client/profile/port";
import { createLiscaMobilePort } from "@lisca/mobile-app";

const port = createLiscaMobilePort({
  defaultPort: 8767,
  createPort: createProfilePort,
});

export const studioProfileClient = port.ensure();
