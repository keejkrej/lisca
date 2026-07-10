import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui/shell";
import { RouterProvider, type AnyRouter } from "@tanstack/solid-router";
import { type JSX, type Component } from "solid-js";
import { render } from "solid-js/web";

export type LiscaWebAppConfig = {
  /** Typed router built by the app (see its `Register` declaration). */
  router: AnyRouter;
  /** Default server port, surfaced through the server settings UI. */
  defaultPort: number;
  /** App id used for session history and active-server persistence. */
  appId: import("@lisca/utils").LiscaAppId;
  /** App-owned atoms provider (port runtime + session hydration). */
  AtomsProvider: Component<{ children?: JSX.Element }>;
  /** DOM id of the mount node (defaults to `root`). */
  rootElementId?: string;
};

/**
 * Mount a Lisca web app: render the shared provider stack around the app's
 * router. Each app supplies only its router, default port, and atoms provider;
 * the provider nesting lives in one place.
 */
export function createLiscaWebApp(config: LiscaWebAppConfig): void {
  const { router, defaultPort, appId, AtomsProvider, rootElementId = "root" } = config;

  const mount = document.getElementById(rootElementId);
  if (!mount) {
    throw new Error(`Lisca web app mount node "#${rootElementId}" was not found`);
  }

  render(
    () => (
      <AtomsProvider>
        <ShellThemeProvider>
          <ShellServerProvider appId={appId} defaultPort={defaultPort}>
            <ShellWorkspaceProvider>
              <RouterProvider router={router} />
            </ShellWorkspaceProvider>
          </ShellServerProvider>
        </ShellThemeProvider>
      </AtomsProvider>
    ),
    mount,
  );
}
