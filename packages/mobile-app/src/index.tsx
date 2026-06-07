import {
  ShellServerProvider,
  ShellThemeProvider,
  ShellWorkspaceProvider,
} from "@lisca/ui-native";
import { StrictMode, type ComponentType, type ReactNode } from "react";

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
      <AtomsProvider>
        <ShellThemeProvider>
          <ShellServerProvider defaultPort={defaultPort}>
            <ShellWorkspaceProvider>{children}</ShellWorkspaceProvider>
          </ShellServerProvider>
        </ShellThemeProvider>
      </AtomsProvider>
    </StrictMode>
  );
}

export { createLiscaMobilePort, type LiscaMobilePort, type LiscaMobilePortEnv } from "./create-lisca-mobile-port.ts";
export { toHostFilePickerOperations } from "./host-operations.ts";
