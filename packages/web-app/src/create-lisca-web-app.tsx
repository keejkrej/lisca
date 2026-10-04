import { installClientLog } from "@lisca/client/client-log";
import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui/shell";
import { type JSX, type Component } from "solid-js";
import { render } from "solid-js/web";

const scrollIdleDelayMs = 700;
const scrollIdleTimers = new WeakMap<HTMLElement, number>();
let overlayScrollbarStateInstalled = false;

function installOverlayScrollbarState(): void {
  if (overlayScrollbarStateInstalled) return;
  overlayScrollbarStateInstalled = true;

  document.addEventListener(
    "scroll",
    (event) => {
      const target =
        event.target === document
          ? document.scrollingElement
          : event.target instanceof HTMLElement
            ? event.target
            : null;
      if (!(target instanceof HTMLElement)) return;

      target.dataset.liscaScrollActive = "";
      const previousTimer = scrollIdleTimers.get(target);
      if (previousTimer !== undefined) window.clearTimeout(previousTimer);
      scrollIdleTimers.set(
        target,
        window.setTimeout(() => {
          delete target.dataset.liscaScrollActive;
          scrollIdleTimers.delete(target);
        }, scrollIdleDelayMs),
      );
    },
    { capture: true, passive: true },
  );
}

export type LiscaWebAppConfig = {
  /** App-owned root component. */
  App: Component;
  /** App id used for per-app theme and storage. */
  appId: import("@lisca/utils").LiscaAppId;
  /** App-owned atoms provider (port runtime + session hydration). */
  AtomsProvider: Component<{ children?: JSX.Element }>;
  /** Server check behind the "Server unreachable" alert (web builds only). */
  probe?: () => Promise<unknown>;
  /** DOM id of the mount node (defaults to `root`). */
  rootElementId?: string;
};

/**
 * Mount a Lisca web app: render the shared provider stack around the app's
 * root. Each app supplies only its root component, app id, and atoms provider;
 * the provider nesting lives in one place.
 */
export function createLiscaWebApp(config: LiscaWebAppConfig): void {
  const { App, appId, AtomsProvider, probe, rootElementId = "root" } = config;

  const mount = document.getElementById(rootElementId);
  if (!mount) {
    throw new Error(`Lisca web app mount node "#${rootElementId}" was not found`);
  }

  installOverlayScrollbarState();
  installClientLog(appId);

  render(
    () => (
      <AtomsProvider>
        <ShellThemeProvider appId={appId}>
          <ShellServerProvider probe={probe}>
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
