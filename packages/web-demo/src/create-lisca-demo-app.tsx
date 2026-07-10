import { ShellThemeProvider } from "@lisca/ui/shell";
import { RouterProvider, type AnyRouter } from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";

export type LiscaDemoAppConfig = {
  router: AnyRouter;
  rootElementId?: string;
  children?: JSX.Element;
};

export function createLiscaDemoApp(config: LiscaDemoAppConfig): void {
  const mount = document.getElementById(config.rootElementId ?? "root");
  if (!mount) {
    throw new Error(
      `Lisca demo app mount node "#${config.rootElementId ?? "root"}" was not found`,
    );
  }

  render(
    () => (
      <ShellThemeProvider>
        {config.children}
        <RouterProvider router={config.router} />
      </ShellThemeProvider>
    ),
    mount,
  );
}