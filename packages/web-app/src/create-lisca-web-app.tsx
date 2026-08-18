import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui/shell";
import { type JSX, type Component } from "solid-js";
import { render } from "solid-js/web";

export type LiscaWebAppConfig = {
  /** App-owned root component. */
  App: Component;
  /** Default server port, surfaced through the server settings UI. */
  defaultPort: number;
  /** App id used for session history and active-server persistence. */
  appId: import("@lisca/utils").LiscaAppId;
  /** App-owned atoms provider (port runtime + session hydration). */
  AtomsProvider: Component<{ children?: JSX.Element }>;
  /** Host-port probe used for the connection-status light. */
  probe?: () => Promise<unknown>;
  /** DOM id of the mount node (defaults to `root`). */
  rootElementId?: string;
};

/**
 * Mount a Lisca web app: render the shared provider stack around the app's
 * root. Each app supplies only its root component, default port, and atoms provider;
 * the provider nesting lives in one place.
 */
export function createLiscaWebApp(config: LiscaWebAppConfig): void {
  const { App, defaultPort, appId, AtomsProvider, probe, rootElementId = "root" } = config;

  const mount = document.getElementById(rootElementId);
  if (!mount) {
    throw new Error(`Lisca web app mount node "#${rootElementId}" was not found`);
  }

  render(
    () => (
      <AtomsProvider>
        <ShellThemeProvider>
          <ShellServerProvider appId={appId} defaultPort={defaultPort} probe={probe}>
            <ShellWorkspaceProvider>
              <App />
            </ShellWorkspaceProvider>
          </ShellServerProvider>
        </ShellThemeProvider>
      </AtomsProvider>
    ),
    mount,
  );
}
