import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui/shell";;
import { RouterProvider, type AnyRouter } from "@tanstack/react-router";
import { StrictMode, type ComponentType, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

export type LiscaWebAppConfig = {
  /** Typed router built by the app (see its `Register` declaration). */
  router: AnyRouter;
  /** Default server port, surfaced through the server settings UI. */
  defaultPort: number;
  /** App-owned atoms provider (port runtime + session hydration). */
  AtomsProvider: ComponentType<{ children: ReactNode }>;
  /** DOM id of the mount node (defaults to `root`). */
  rootElementId?: string;
};

/**
 * Mount a Lisca web app: render the shared provider stack around the app's
 * router. Each app supplies only its router, default port, and atoms provider;
 * the provider nesting lives in one place.
 */
export function createLiscaWebApp(config: LiscaWebAppConfig): void {
  const { router, defaultPort, AtomsProvider, rootElementId = "root" } = config;

  const mount = document.getElementById(rootElementId);
  if (!mount) {
    throw new Error(`Lisca web app mount node "#${rootElementId}" was not found`);
  }

  createRoot(mount).render(
    <StrictMode>
      <AtomsProvider>
        <ShellThemeProvider>
          <ShellServerProvider defaultPort={defaultPort}>
            <ShellWorkspaceProvider>
              <RouterProvider router={router} />
            </ShellWorkspaceProvider>
          </ShellServerProvider>
        </ShellThemeProvider>
      </AtomsProvider>
    </StrictMode>,
  );
}
