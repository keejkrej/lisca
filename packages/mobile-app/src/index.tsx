import { NativeWindThemeSync, ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui-native";
import "@lisca/ui-native/global.css";
import { PortalHost } from "@rn-primitives/portal";
import type { LiscaAppId } from "@lisca/utils";
import { StrictMode, type ComponentType, type ReactNode } from "react";

import { LiscaFontsProvider } from "./lisca-fonts-provider";

export type LiscaMobileAppConfig = {
  defaultPort: number;
  appId: LiscaAppId;
  AtomsProvider: ComponentType<{ children: ReactNode }>;
  children: ReactNode;
};

export function LiscaMobileProviders({
  defaultPort,
  appId,
  AtomsProvider,
  children,
}: LiscaMobileAppConfig) {
  return (
    <StrictMode>
      <LiscaFontsProvider>
        <AtomsProvider>
          <ShellThemeProvider>
            <NativeWindThemeSync>
              <ShellServerProvider appId={appId} defaultPort={defaultPort}>
                <ShellWorkspaceProvider>
                  {children}
                  <PortalHost />
                </ShellWorkspaceProvider>
              </ShellServerProvider>
            </NativeWindThemeSync>
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
