import type {
  OptionsOf,
  Primitive,
  PropsOf,
  PropSpec,
  SlotName,
  StateOf,
  TypesOf,
} from "@ui-sdk/core";
import {
  attrs,
  handlers,
  partState,
  present,
  ref,
  schemaOf,
  subscribe,
  takeOwnId,
  yieldToAuthor,
} from "@ui-sdk/core/renderer";
import {
  $PROXY,
  createContext,
  createMemo,
  createRenderEffect,
  createSignal,
  createUniqueId,
  mergeProps,
  onCleanup,
  onMount,
  Show,
  splitProps,
  untrack,
  useContext,
  type Accessor,
  type Component,
  type ComponentProps,
  type Context,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

// UI SDK beta.3's official Solid adapter requires Solid 2. Keep the Solid 1
// renderer here, with core pinned alongside its internal renderer interface.
type RecordProps = Record<string, unknown>;
type Schema = Record<string, PropSpec>;
const noProps = () => ({});

export type PrimitiveHandle<P extends Primitive> = {
  primitive: P;
  instance: ReturnType<P>;
  readonly api: TypesOf<P>["api"];
  readonly state: TypesOf<P>["state"];
  present: (name: SlotName<P>, props?: Accessor<RecordProps>) => Accessor<boolean>;
  slot: (name: SlotName<P>, props?: Accessor<RecordProps>, user?: RecordProps) => RecordProps;
};

export function usePrimitive<P extends Primitive>(
  primitive: P,
  options: Accessor<OptionsOf<P>>,
): PrimitiveHandle<P> {
  const id = `ui-sdk-${createUniqueId()}`;
  const instance = untrack(() => primitive({ ...options(), id })) as ReturnType<P>;
  const [version, setVersion] = createSignal(0);
  const unsubscribe = instance.subscribe(() => setVersion((value) => value + 1));
  createRenderEffect(() => {
    const next = { ...options(), id };
    untrack(() => instance.setOptions(next));
  });
  onCleanup(() => {
    unsubscribe();
    instance.destroy();
  });

  const track = (name: SlotName<P>, props: Accessor<RecordProps>) => {
    const [tick, setTick] = createSignal(0);
    const part = createMemo(() => instance.part(name, props()), undefined, { equals: false });
    createRenderEffect(() => {
      const current = part();
      const release = subscribe(current, () => setTick((value) => value + 1), current.props);
      onCleanup(release);
    });
    return () => {
      tick();
      return part();
    };
  };

  return {
    primitive,
    instance,
    get api() {
      return instance.api;
    },
    get state() {
      version();
      return instance.get();
    },
    present(name, props = noProps) {
      const part = track(name, props);
      return () => present(part());
    },
    slot(name, props = noProps, user = {}) {
      const part = track(name, props);
      let element: HTMLElement | undefined;
      let attached: HTMLElement | undefined;
      let disposed = false;
      let binding = ref(untrack(part), { by: "framework", attaches: "all" });
      const attach = () => {
        if (disposed || !element?.isConnected || element === attached) return;
        attached = element;
        binding(element);
      };
      onMount(attach);
      createRenderEffect(() => {
        const current = instance.part(name, props());
        const next = ref(current, { by: "framework", attaches: "all" });
        if (binding === next) return;
        binding(null);
        binding = next;
        if (attached) binding(attached);
      });
      onCleanup(() => {
        disposed = true;
        binding(null);
        element = attached = undefined;
      });

      const events: RecordProps = {};
      for (const event of Object.keys(handlers(untrack(part)))) {
        const prop = eventProp(event);
        events[prop] = (value: Event) => {
          callHandler(user[prop], value);
          if (!value.defaultPrevented) {
            handlers(instance.part(name, props()))[event as keyof HTMLElementEventMap]?.(value);
          }
        };
      }
      const own = createMemo(() => {
        const current = part();
        takeOwnId(current, user.id);
        const result: RecordProps = {};
        for (const [key, value] of Object.entries(
          yieldToAuthor(attrs(current), (attribute) => user[attribute] != null),
        )) {
          if (value === undefined) continue;
          result[key] = booleanAttrs.has(key) ? true : value;
        }
        if (result.style !== undefined && user.style !== undefined) {
          const ownStyle = styleObject(result.style);
          const authored = user.style;
          result.style =
            typeof authored === "function"
              ? (state: unknown) => ({ ...styleObject(authored(state)), ...ownStyle })
              : { ...styleObject(authored), ...ownStyle };
        }
        if (user.id != null) result.id = user.id;
        return result;
      });
      return slotProps(user, own, {
        ...events,
        ref(el: HTMLElement) {
          element = el;
          if (typeof user.ref === "function") user.ref(el);
          if (el.isConnected) attach();
          else queueMicrotask(attach);
        },
      });
    },
  };
}

// A generic mergeProps would read attributes even when looking up children.
// That would recreate the children whenever the primitive changes its state.
function slotProps(
  user: RecordProps,
  attributes: Accessor<RecordProps>,
  own: RecordProps,
): RecordProps {
  const get = (key: string) => {
    if (key in own) return own[key];
    if (key in untrack(attributes)) return attributes()[key];
    return key in user || key === "children" ? user[key] : attributes()[key];
  };
  const has = (key: string) => key in own || key in untrack(attributes) || key in user;
  const proxy: RecordProps = new Proxy(
    {},
    {
      get: (_, key) => (typeof key === "string" ? get(key) : key === $PROXY ? proxy : undefined),
      has: (_, key) => (typeof key === "string" ? has(key) : key === $PROXY),
      ownKeys: () => [
        ...new Set([...Object.keys(attributes()), ...Object.keys(user), ...Object.keys(own)]),
      ],
      getOwnPropertyDescriptor: (_, key) =>
        typeof key === "string" && has(key)
          ? { enumerable: true, configurable: true, get: () => get(key) }
          : undefined,
    },
  );
  return proxy;
}

const booleanAttrs = new Set([
  "checked",
  "disabled",
  "hidden",
  "multiple",
  "readonly",
  "required",
  "selected",
  "inert",
  "autofocus",
  "open",
]);
const eventNames: Record<string, string> = {
  beforeinput: "onBeforeInput",
  contextmenu: "onContextMenu",
  dblclick: "onDblClick",
  focusin: "onFocusIn",
  focusout: "onFocusOut",
  keydown: "onKeyDown",
  keyup: "onKeyUp",
  mousedown: "onMouseDown",
  mouseup: "onMouseUp",
  mouseenter: "onMouseEnter",
  mouseleave: "onMouseLeave",
  pointerdown: "onPointerDown",
  pointerup: "onPointerUp",
  pointermove: "onPointerMove",
  pointerenter: "onPointerEnter",
  pointerleave: "onPointerLeave",
  pointercancel: "onPointerCancel",
};
const eventProp = (event: string) =>
  eventNames[event] ?? `on${event[0].toUpperCase()}${event.slice(1)}`;

export function callHandler(handler: unknown, event: Event) {
  if (typeof handler === "function") handler(event);
  else if (Array.isArray(handler) && typeof handler[0] === "function")
    handler[0](handler[1], event);
}

function styleObject(value: unknown): RecordProps {
  if (typeof value !== "string") return (value ?? {}) as RecordProps;
  return Object.fromEntries(
    value.split(";").flatMap((entry) => {
      const colon = entry.indexOf(":");
      return colon < 0 ? [] : [[entry.slice(0, colon).trim(), entry.slice(colon + 1).trim()]];
    }),
  );
}

type Scope = { handle: PrimitiveHandle<Primitive>; around: Record<string, Accessor<RecordProps>> };
const scopes = new WeakMap<Primitive, Context<Scope | undefined>>();
function scopeOf(primitive: Primitive) {
  let scope = scopes.get(primitive);
  if (!scope) {
    scope = createContext<Scope>();
    scopes.set(primitive, scope);
  }
  return scope;
}

export function useHandle<P extends Primitive>(primitive: P): PrimitiveHandle<P> {
  const scope = useContext(scopeOf(primitive));
  if (!scope) throw new Error("UI SDK parts must be rendered inside their root.");
  return scope.handle as PrimitiveHandle<P>;
}

export function providePrimitive<P extends Primitive>(
  handle: PrimitiveHandle<P>,
  children: Accessor<JSX.Element>,
) {
  const Scope = scopeOf(handle.primitive);
  return <Scope.Provider value={{ handle, around: {} }}>{children()}</Scope.Provider>;
}

function inheritedFrom(spec: PropSpec, key: string) {
  if (typeof spec !== "object") return;
  const [slot, prop = key] = spec.from.split(".");
  return { slot, prop, required: spec.required };
}

function pick(props: RecordProps, schema: Schema): RecordProps {
  return Object.fromEntries(
    Object.keys(schema).flatMap((key) => (props[key] === undefined ? [] : [[key, props[key]]])),
  );
}

export function usePart<P extends Primitive>(
  source: PrimitiveHandle<P> | P,
  slot: SlotName<P>,
  part: Accessor<RecordProps> = noProps,
  props: RecordProps = {},
  tag: ValidComponent = "div",
): JSX.Element {
  const primitive = typeof source === "function" ? source : source.primitive;
  const Scope = scopeOf(primitive);
  const inherited = useContext(Scope);
  const handle = typeof source === "function" ? useHandle(source) : source;
  const schema = schemaOf(primitive);
  const provides = Object.values(schema.slots).some((fields) =>
    Object.entries(fields).some(([key, spec]) => inheritedFrom(spec, key)?.slot === slot),
  );
  const keyed = Object.values(schema.slots[slot] ?? {}).some(
    (spec) => (typeof spec === "object" ? spec.kind : spec) === "key",
  );
  const around = {
    ...(inherited?.handle === handle ? inherited.around : {}),
    ...(provides ? { [slot]: () => (keyed ? { ...part(), value: part().id } : part()) } : {}),
  };
  const isPresent = handle.present(slot, part);
  const render = () => {
    const bound = handle.slot(slot, part, props);
    const state = new Proxy(
      {},
      {
        get: (_, key) => {
          void handle.state;
          return partState(handle.instance.part(slot, part()))[key];
        },
      },
    );
    const [local, rest] = splitProps(bound, ["as", "render", "class", "style", "children"]);
    const resolve = (value: unknown) => (typeof value === "function" ? value(state) : value);
    const elementProps = mergeProps(rest, {
      get class() {
        return resolve(local.class);
      },
      get style() {
        return resolve(local.style);
      },
      get children() {
        const children = local.children;
        return typeof children === "function" && children.length > 0 ? children(state) : children;
      },
    });
    if (typeof local.render === "function") {
      const custom = local.render;
      return createMemo(() => custom(elementProps, state)) as unknown as JSX.Element;
    }
    return <Dynamic component={(local.as ?? tag) as ValidComponent} {...elementProps} />;
  };
  return (
    <Scope.Provider value={{ handle, around }}>
      <Show when={isPresent()}>
        {(shown) => {
          shown();
          return render();
        }}
      </Show>
    </Scope.Provider>
  );
}

type Pascal<S extends string> = S extends `${infer A}-${infer B}`
  ? `${Capitalize<A>}${Pascal<B>}`
  : Capitalize<S>;
type RenderProps<S> = {
  as?: ValidComponent;
  render?: (props: RecordProps, state: S) => JSX.Element;
  class?: string | ((state: S) => string | undefined);
  style?: JSX.CSSProperties | string | ((state: S) => JSX.CSSProperties | string | undefined);
  children?: JSX.Element | ((state: S) => JSX.Element);
};
type PartProps<P extends Primitive, S extends SlotName<P>, T extends ValidComponent> = Omit<
  ComponentProps<T>,
  keyof PropsOf<P, S> | keyof RenderProps<StateOf<P, S>>
> &
  PropsOf<P, S> &
  RenderProps<StateOf<P, S>>;
type Parts<P extends Primitive, T extends Partial<Record<SlotName<P>, ValidComponent>>> = {
  Root: Component<
    OptionsOf<P> &
      Omit<JSX.HTMLAttributes<HTMLElement>, keyof OptionsOf<P>> & { as?: ValidComponent }
  >;
} & {
  [S in Exclude<keyof T, "root"> & SlotName<P> as Pascal<S>]: Component<
    PartProps<P, S, NonNullable<T[S]>>
  >;
};

export function createParts<
  P extends Primitive,
  const T extends Partial<Record<SlotName<P>, ValidComponent>>,
>(primitive: P, tags: T): Parts<P, T> {
  const schema = schemaOf(primitive);
  const parts: Record<string, Component<RecordProps>> = {};
  parts.Root = (props) => {
    const handle = usePrimitive(primitive, () => pick(props, schema.options) as OptionsOf<P>);
    const rootTag = (tags as Record<string, ValidComponent>).root;
    if (!rootTag) return providePrimitive(handle, () => props.children as JSX.Element);
    const rootSchema = schema.slots.root ?? {};
    const [, rest] = splitProps(props, [
      ...Object.keys(schema.options),
      ...Object.keys(rootSchema),
    ]);
    return usePart(handle, "root" as SlotName<P>, () => pick(props, rootSchema), rest, rootTag);
  };
  for (const [slot, tag] of Object.entries(tags)) {
    if (slot === "root") continue;
    const fields = schema.slots[slot] ?? {};
    parts[
      slot.replace(/(^|-)(\w)/g, (_, _dash: string, character: string) => character.toUpperCase())
    ] = (props) => {
      const scope = useContext(scopeOf(primitive));
      if (!scope) throw new Error(`The ${slot} part must be rendered inside its root.`);
      const ids = Object.fromEntries(
        Object.entries(fields)
          .filter(([, spec]) => spec === "id")
          .map(([key]) => [key, createUniqueId()]),
      );
      const part = () => {
        const named = pick(props, fields);
        for (const [key, spec] of Object.entries(fields)) {
          const from = inheritedFrom(spec, key);
          if (from?.required && !scope.around[from.slot])
            throw new Error(`The ${slot} part must be rendered inside ${from.slot}.`);
          named[key] ??= ids[key] ?? (from ? scope.around[from.slot]?.()[from.prop] : undefined);
          if ((typeof spec === "object" ? spec.kind : spec) === "key") {
            const api = scope.handle.api as { internal: { keyOf(value: unknown): string } };
            named.id = api.internal.keyOf(named[key]);
          }
        }
        return named;
      };
      const [, rest] = splitProps(
        props,
        Object.keys(fields).filter((key) => key !== "id"),
      );
      return usePart(scope.handle, slot, part, rest, tag as ValidComponent);
    };
  }
  return parts as unknown as Parts<P, T>;
}
