import type { Component, Renderer, View } from "@effect/ui";
import { Router } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import {
  ShellServerProbe,
  ShellServerProvider,
  ShellThemeProvider,
  ShellWorkspaceProvider,
} from "@lisca/ui/shell";
import { Effect, Exit, Layer, Schema, Scope } from "effect";

import {
  StudioNavigationProvider,
  StudioRoute,
  studioRouteForPath,
} from "../src/navigation/studio-router";

const cleanups: Array<() => Promise<void>> = [];

export type MountedTest<Model, Msg> = {
  readonly container: HTMLDivElement;
  readonly root: Renderer.Root<Model, Msg>;
  readonly unmount: () => Promise<void>;
};

export async function mountTest<
  Name extends string,
  Props,
  Model,
  Msg,
  Events,
  R,
  V extends View.Elements,
>(
  component: Component.Members<Name, Props, Model, Msg, Events, R, V, any> &
    BrowserHost.HtmlRoot<V>,
  props: Props,
  options?: {
    readonly layer?: Layer.Layer<Exclude<R, Html.Host>, never, never> | undefined;
    readonly onEmit?: ((event: Events) => void) | undefined;
  },
): Promise<MountedTest<Model, Msg>> {
  const scope = Effect.runSync(Scope.make());
  const container = document.createElement("div");
  document.body.appendChild(container);

  const effect = BrowserHost.mountEffect(
    component,
    props,
    container,
    options?.onEmit ? { onEmit: options.onEmit } : undefined,
  );

  const provided = options?.layer
    ? Layer.build(options.layer as Layer.Layer<any>).pipe(
        Effect.flatMap((ctx) => effect.pipe(Effect.provide(ctx))),
      )
    : (effect as Effect.Effect<Renderer.Root<Model, Msg>, never, Scope.Scope>);

  const root = await Effect.runPromise(Scope.provide(scope)(provided));

  let closed = false;
  const unmount = async () => {
    if (closed) return;
    closed = true;
    await Effect.runPromise(Scope.close(scope, Exit.void));
    container.remove();
  };

  cleanups.push(unmount);
  return { container, root, unmount };
}

/**
 * Mounts a Studio test view wrapped with `ShellThemeProvider`, `ShellServerProvider`,
 * `ShellWorkspaceProvider`, and `StudioNavigationProvider` + `Router.memory`.
 */
export async function mountStudioShellTest(
  renderBody: (h: Html.H<never>) => View.Content<never, any>,
  options?: {
    readonly url?: string | undefined;
    readonly layer?: Layer.Layer<any, never, never> | undefined;
    readonly probe?: (() => Promise<unknown>) | undefined;
  },
): Promise<MountedTest<{}, never>> {
  const url = options?.url ?? "/assay";
  const initialRoute = studioRouteForPath(url.split("?")[0] ?? "/assay");

  const Host = Html.component({
    name: "StudioShellTestHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Schema.Never,
  }).make({
    init: () => ({}),
    update: {},
    view: (h) =>
      ShellThemeProvider(h, {
        props: { storageKey: "studio-test-theme" },
        view: () =>
          ShellServerProvider(h, {
            props: {},
            view: () =>
              ShellWorkspaceProvider(h, {
                props: {},
                view: () =>
                  StudioNavigationProvider(h, {
                    props: { initialRoute },
                    view: () => renderBody(h),
                  }),
              }),
          }),
      }),
  });

  const routerLayer = Router.memory({ routes: StudioRoute, url });
  const probeLayer = Layer.succeed(ShellServerProbe, options?.probe);
  const baseLayer = Layer.mergeAll(routerLayer, probeLayer);
  const fullLayer = options?.layer ? Layer.merge(baseLayer, options.layer) : baseLayer;

  return mountTest(Host as any, {}, { layer: fullLayer as any });
}

export async function cleanupMounted(): Promise<void> {
  while (cleanups.length > 0) {
    const fn = cleanups.pop();
    if (fn) await fn();
  }
  document.body.innerHTML = "";
}

export async function flushMicrotasks(ticks = 4): Promise<void> {
  for (let i = 0; i < ticks; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

export function clickElement(el: Element): void {
  el.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerType: "mouse",
    }),
  );
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 0 }));
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
}

export function keyDownElement(
  el: Element | Document | Window,
  key: string,
  init: KeyboardEventInit = {},
): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
}

export function setInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
}

export async function waitForCondition<T>(
  check: () => T | null | undefined | false,
  timeoutMs = 2000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const value = check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  if (lastError) throw lastError;
  const finalValue = check();
  if (finalValue) return finalValue;
  throw new Error("Timed out waiting for condition");
}
