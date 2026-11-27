import type { Component, Renderer, View } from "@effect/ui";
import { BrowserHost } from "@effect/ui/html";
import type { Html } from "@effect/ui/html";
import { Effect, Exit, Layer, Scope } from "effect";

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
    ? effect.pipe(Effect.provide(options.layer as Layer.Layer<any>))
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

export function keyDownElement(el: Element, key: string, init: KeyboardEventInit = {}): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
}

export function keyUpElement(el: Element, key: string, init: KeyboardEventInit = {}): void {
  el.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true, ...init }));
}
