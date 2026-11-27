import type { Component, View } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { DevTools } from "@effect/ui-devtools";
import { installClientLog } from "@lisca/client/client-log";
import { installWebMcp } from "@lisca/client/webmcp";
import {
  ShellServerProbe,
  ShellServerProvider,
  ShellThemeProvider,
  ShellWorkspaceProvider,
} from "@lisca/ui/shell";
import type { LiscaAppId } from "@lisca/utils";
import { Effect, Fiber, Layer, Schema } from "effect";

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

type LiscaShellShared =
  | Component.Shared<"ShellThemeProvider">
  | Component.Shared<"ShellServerProvider">
  | Component.Shared<"ShellWorkspaceProvider">;

export type LiscaWebAppConfig<R = never> = {
  /** App-owned root Effect UI component (takes empty props `{}`). */
  readonly App: Component.Component<any, {}, any, any, any, R, Html.Elements>;
  /** App id used for per-app theme and storage. */
  readonly appId: LiscaAppId;
  /** Optional Effect Layer providing app services/commands/router. */
  readonly layer?: Layer.Layer<Exclude<R, Html.Host | LiscaShellShared>, never, never> | undefined;
  /** Server check behind the "Server unreachable" alert (web builds only). */
  readonly probe?: (() => Promise<unknown>) | undefined;
  /** DOM id of the mount node (defaults to `root`). */
  readonly rootElementId?: string | undefined;
};

/**
 * Mount a Lisca web app using Effect UI (`BrowserHost.mount`): wraps the app root
 * with `ShellThemeProvider`, `ShellServerProvider`, and `ShellWorkspaceProvider`,
 * and attaches `@effect/ui-devtools` in development builds.
 */
export function createLiscaWebApp<R = never>(config: LiscaWebAppConfig<R>): () => void {
  const { App, appId, layer, probe, rootElementId = "root" } = config;

  const mount = document.getElementById(rootElementId);
  if (!mount) {
    throw new Error(`Lisca web app mount node "#${rootElementId}" was not found`);
  }

  installOverlayScrollbarState();
  installClientLog(appId);

  const disposeWebMcp = installWebMcp(appId);

  const LiscaAppRoot = Html.component({
    name: `LiscaRoot(${appId})`,
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Schema.Never,
  }).make({
    init: () => ({}),
    update: ($) => $.model,
    view: (h) =>
      ShellThemeProvider(h, {
        props: { appId },
        view: () =>
          ShellServerProvider(h, {
            props: {},
            view: () =>
              ShellWorkspaceProvider(h, {
                props: {},
                view: () => App(h, { props: {} }) as View.Content<never, any>,
              }),
          }),
      }),
  });

  const probeLayer = Layer.succeed(ShellServerProbe, probe);
  const devToolsLayer = import.meta.env.DEV
    ? DevTools.layer({ position: "BottomRight" })
    : Layer.empty;

  const baseLayer = Layer.mergeAll(probeLayer, devToolsLayer);
  const fullLayer = layer ? Layer.merge(baseLayer, layer as Layer.Layer<any>) : baseLayer;

  const mainLayer = BrowserHost.mount(LiscaAppRoot, {}, mount).pipe(
    Layer.provide(fullLayer as Layer.Layer<any>),
  );

  const fiber = Effect.runFork(Layer.launch(mainLayer as Layer.Layer<never, never, never>));

  const dispose = () => {
    disposeWebMcp();
    void Effect.runPromise(Fiber.interrupt(fiber));
  };

  import.meta.hot?.dispose(dispose);
  return dispose;
}
