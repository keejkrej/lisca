import { ShellThemeProvider } from "@lisca/ui/shell";
import { RouterProvider, createRouter } from "@tanstack/solid-router";
import { render } from "solid-js/web";

import "./index.css";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  scrollRestoration: true,
});

declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}

render(
  () => (
    <ShellThemeProvider defaultMode="light" storageKey="lisca-landing-theme">
      <RouterProvider router={router} />
    </ShellThemeProvider>
  ),
  document.getElementById("root")!,
);