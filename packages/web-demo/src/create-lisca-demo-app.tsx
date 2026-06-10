import { ShellThemeProvider } from "@lisca/ui/shell";
import { RouterProvider, type AnyRouter } from "@tanstack/react-router";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

export type LiscaDemoAppConfig = {
  router: AnyRouter;
  rootElementId?: string;
  children?: ReactNode;
};

export function createLiscaDemoApp(config: LiscaDemoAppConfig): void {
  const { router, rootElementId = "root", children } = config;
  const mount = document.getElementById(rootElementId);
  if (!mount) {
    throw new Error(`Lisca demo app mount node "#${rootElementId}" was not found`);
  }

  createRoot(mount).render(
    <StrictMode>
      <ShellThemeProvider>
        {children}
        <RouterProvider router={router} />
      </ShellThemeProvider>
    </StrictMode>,
  );
}
