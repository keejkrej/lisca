import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui-native";
import { StrictMode, type ComponentType, type ReactNode } from "react";

import { LiscaFontsProvider } from "./lisca-fonts-provider";

export type LiscaMobileAppConfig = {
  defaultPort: number;
  AtomsProvider: ComponentType<{ children: ReactNode }>;
  children: ReactNode;
};

export function LiscaMobileProviders({
  defaultPort,
  AtomsProvider,
  children,
}: LiscaMobileAppConfig) {
  return (
    <StrictMode>
      <LiscaFontsProvider>
        <AtomsProvider>
          <ShellThemeProvider>
            <ShellServerProvider defaultPort={defaultPort}>
              <ShellWorkspaceProvider>{children}</ShellWorkspaceProvider>
            </ShellServerProvider>
          </ShellThemeProvider>
        </AtomsProvider>
      </LiscaFontsProvider>
    </StrictMode>
  );
}

export {
  createLiscaMobilePort,
  type LiscaMobilePort,
  type LiscaMobilePortEnv,
} from "./create-lisca-mobile-port";
export { toHostFilePickerOperations } from "./host-operations";
export { StorageBootstrap } from "./storage-bootstrap";
