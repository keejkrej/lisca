# PORTING.md — React 19 → SolidJS Mechanical Translation Guide

This document is the single source of truth for the LiSCA React-to-SolidJS rewrite.
It follows the "Rewriting Bun in Rust" methodology: create the mapping guide FIRST,
then mechanically translate every file, then fix compiler errors as a work queue.

**Scope:** Web only. All React Native / Expo / mobile apps and packages are being
**deleted** (not migrated). Tauri desktop and Rust backends are unaffected.

**Decisions:**
- UI primitives: **Kobalte** (`@kobalte/core`) replaces `@base-ui/react` (coss)
- Strategy: **Big bang** on `port/solidjs-rewrite` branch
- React Compiler: **removed entirely** (Solid signals are inherently fine-grained)

---

## 1. Framework & Library Mapping Table

| React dependency | SolidJS replacement |
|---|---|
| `react` | `solid-js` |
| `react-dom/client` | `solid-js/web` |
| `@tanstack/react-router` | `@tanstack/solid-router` |
| `@tanstack/router-plugin` | `@tanstack/router-plugin` (same, `target: "solid"`) |
| `@effect-atom/atom-react` | `@effect-atom/atom-solid` |
| `@base-ui/react` (12 coss primitives) | `@kobalte/core` (see §9) |
| `lucide-react` | `lucide-solid` |
| `react-dom` | `solid-js/web` |
| `@vitejs/plugin-react` | `vite-plugin-solid` |
| `babel-plugin-react-compiler` | **REMOVED** |
| `@rolldown/plugin-babel` | **REMOVED** |
| `html2canvas-pro` | `html2canvas-pro` (framework-agnostic, unchanged) |
| `jspdf` | `jspdf` (framework-agnostic, unchanged) |
| `clsx` / `class-variance-authority` | unchanged (framework-agnostic) |
| `tailwind-merge` | unchanged (framework-agnostic) |
| `tailwindcss` v4 | unchanged (CSS-first, framework-agnostic) |

---

## 2. Hook Mapping (CRITICAL)

### 2.1 useState → createSignal

```tsx
// React
const [count, setCount] = useState(0);
const [items, setItems] = useState<Item[]>([]);

// Solid
const [count, setCount] = createSignal(0);
const [items, setItems] = createSignal<Item[]>([]);
```

**Key difference:** In Solid, `count` is a *getter function*. Access the value by
calling it: `count()`. This is what creates reactivity. In JSX, write `{count()}`
not `{count}`.

### 2.2 useEffect → onMount / createEffect / onCleanup

```tsx
// React — runs after every render where deps change
useEffect(() => {
  const sub = ws.subscribe();
  return () => sub.unsubscribe();
}, [wellId]);

// Solid — onMount runs once
onMount(() => {
  const sub = ws.subscribe();
  onCleanup(() => sub.unsubscribe());
});

// Solid — createEffect tracks signals automatically (no dep array needed)
createEffect(() => {
  const id = wellId(); // tracked
  const sub = ws.subscribe(id);
  onCleanup(() => sub.unsubscribe());
});
```

**Rules:**
- `createEffect` runs after render and tracks every signal accessed inside it. **No dependency array needed.**
- `onMount` runs once after initial render. Use for one-time setup.
- `onCleanup` registers cleanup that runs when the owning scope is destroyed.
- `createRenderEffect` runs during render (before DOM mutations). Rarely needed.

### 2.3 useRef → plain variable

```tsx
// React
const canvasRef = useRef<HTMLCanvasElement>(null);
<canvas ref={canvasRef} />
canvasRef.current?.getContext('2d');

// Solid — ref is a callback or signal
let canvasEl: HTMLCanvasElement | undefined;
<canvas ref={canvasEl!} />
// OR with a signal for reactive access:
const [canvasEl, setCanvasEl] = createSignal<HTMLCanvasElement>();
<canvas ref={setCanvasEl} />
canvasEl()?.getContext('2d');
```

**Rule:** In Solid, `ref` is populated before the component body finishes running (it
runs once). No `.current` property — use the variable directly.

### 2.4 useContext → useContext (Solid's own)

```tsx
// React
const ctx = useContext(AlignContext);

// Solid
import { useContext } from "solid-js";
const ctx = useContext(AlignContext); // same API, different Context object
```

Solid contexts are created with `createContext` from `solid-js`. They are NOT
compatible with React contexts — must be recreated.

### 2.5 useMemo → createMemo

```tsx
// React (note: LiSCA bans useMemo via React Compiler, but some may exist)
const sorted = useMemo(() => items.sort(byId), [items]);

// Solid
const sorted = createMemo(() => items().sort(byId));
```

### 2.6 useCallback → NOT NEEDED

```tsx
// React
const handleClick = useCallback((id: string) => { ... }, [wellId]);

// Solid — just a function, signals handle reactivity
const handleClick = (id: string) => { ... wellId() ... };
```

Solid does not need callback stability. Functions are cheap; reactivity comes from
signal access inside the function.

### 2.7 React.memo / memo → NOT NEEDED

```tsx
// React
const ExpensiveChild = React.memo(({ data }) => { ... });

// Solid — just a component
function ExpensiveChild(props) { ... }
```

Solid components run once. They never re-render. Signal access in JSX is what
updates the DOM. No memoization needed at the component level.

### 2.8 Effect Atom Hooks (atom-react → atom-solid)

```tsx
// React (@effect-atom/atom-react)
import { useAtom, useAtomValue, useAtomSet, useAtomInitialValues, RegistryProvider } from "@effect-atom/atom-react";

const [value, setValue] = useAtom(myAtom);
const value = useAtomValue(myAtom);
const setValue = useAtomSet(myAtom);
useAtomInitialValues(myAtom, initialValues);

<RegistryProvider runtime={runtime}>
  <App />
</RegistryProvider>

// Solid (@effect-atom/atom-solid) — ⚠️ VERIFY exact export names against atom-solid's d.ts
import { useAtom, useAtomValue, useAtomSet, useAtomInitialValues, RegistryProvider } from "@effect-atom/atom-solid";

const [value, setValue] = useAtom(myAtom);
const value = useAtomValue(myAtom);
const setValue = useAtomSet(myAtom);
useAtomInitialValues(myAtom, initialValues);

<RegistryProvider runtime={runtime}>
  {props.children}
</RegistryProvider>
```

**⚠️ VERIFY:** Before batch translation, inspect `node_modules/@effect-atom/atom-solid/dist/index.d.ts`
to confirm exact export names. The API is expected to mirror atom-react but with Solid
primitives underneath. Atom *definitions* (`Atom.run`, `Atom.make`, `Atom.runtime`)
are framework-agnostic and should NOT change.

### 2.9 Custom Hooks → Solid Functions

```tsx
// React hook
function useAlignStateCore(opts: AlignOpts) {
  const [state, setState] = useState<AlignState>(initial);
  useEffect(() => { recompute(opts.wellId); }, [opts.wellId]);
  return { state, setState };
}

// Solid — same function shape, different primitives inside
function useAlignStateCore(opts: () => AlignOpts) {
  // NOTE: opts is now a getter if it contains reactive values
  const [state, setState] = createSignal<AlignState>(initial);
  createEffect(() => {
    const o = opts();
    recompute(o.wellId);
  });
  return { state, setState };
}
```

**Pattern:** When a hook receives reactive inputs, pass them as getters (signals or
accessor functions), not plain values. The hook reads them inside `createEffect` /
`createMemo` to establish tracking.

---

## 3. Component Pattern Mapping

### 3.1 Function Components

```tsx
// React
function MyComponent({ title, items, onSelect }: Props) {
  return <div>{title}</div>;
}

// Solid — props are a proxy, NEVER destructure (loses reactivity)
function MyComponent(props: Props) {
  return <div>{props.title}</div>;
}
```

**CRITICAL RULE:** Never destructure props in Solid. Always access `props.foo`
directly. If you need to split, use `splitProps`.

### 3.2 children Prop

```tsx
// React
function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

// Solid
import { children, JSX } from "solid-js";
function Card(props: { children?: JSX.Element }) {
  const resolved = children(() => props.children);
  return <div class="card">{resolved()}</div>;
}

// OR for simple cases:
function Card(props: { children?: JSX.Element }) {
  return <div class="card">{props.children}</div>;
}
```

### 3.3 Conditional Rendering → Show

```tsx
// React
{isLoading && <Spinner />}
{isOpen ? <Content /> : <Placeholder />}

// Solid
<Show when={isLoading()}>
  <Spinner />
</Show>

<Show when={isOpen()} fallback={<Placeholder />}>
  <Content />
</Show>

// Ternary also works for simple cases:
{isOpen() ? <Content /> : <Placeholder />}
```

Use `<Show>` for conditional blocks (lazy evaluation, better for non-trivial content).
Simple ternaries with primitives work fine inline.

### 3.4 List Rendering → For / Index

```tsx
// React
{items.map((item) => <Row key={item.id} item={item} />)}

// Solid — <For> keys by reference, efficient for object arrays
<For each={items()}>
  {(item) => <Row item={item} />}
</For>

// Solid — <Index> keys by index, use for primitive arrays or when index matters
<Index each={items()}>
  {(item, index) => <Row item={item()} index={index} />}
</Index>
```

**Rule:** Prefer `<For>` for arrays of objects. The callback receives the item
directly (not a getter). Prefer `<Index>` for arrays of primitives, where the
callback receives a getter accessor.

### 3.5 Fragment

```tsx
// React
<>
  <A />
  <B />
</>

// Solid — same syntax works
<>
  <A />
  <B />
</>

// OR explicit:
import { Fragment } from "solid-js";
<Fragment>
  <A />
  <B />
</Fragment>
```

### 3.6 Props Spreading → splitProps / mergeProps

```tsx
// React
function Input({ label, ...rest }: InputProps) {
  return <label>{label}<input {...rest} /></label>;
}

// Solid — splitProps to separate reactive props
function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ["label"]);
  return <label>{local.label}<input {...rest} /></label>;
}

// mergeProps for merging defaults with incoming props
const merged = mergeProps({ variant: "default" }, props);
```

### 3.7 ForwardRef → NOT NEEDED

```tsx
// React
const MyInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input ref={ref} {...props} />;
});

// Solid — ref is just a prop
function MyInput(props: Props & { ref?: HTMLInputElement }) {
  return <input ref={props.ref} {...props} />;
}
```

### 3.8 Portals → Portal

```tsx
// React (react-dom)
import { createPortal } from "react-dom";
createPortal(<Modal />, document.body);

// Solid
import { Portal } from "solid-js/web";
<Portal>
  <Modal />
</Portal>

// OR mount to specific element:
<Portal mount={document.getElementById("modal-root")!}>
  <Modal />
</Portal>
```

### 3.9 Error Boundaries → ErrorBoundary

```tsx
// React
class ErrorBoundary extends React.Component<...> { ... }

// Solid — built-in component
import { ErrorBoundary } from "solid-js";
<ErrorBoundary fallback={(err, reset) => <ErrorDisplay err={err} />}>
  <RiskyComponent />
</ErrorBoundary>
```

### 3.10 Suspense / lazy

```tsx
// React
const LazyComp = lazy(() => import("./Heavy"));
<Suspense fallback={<Spinner />}><LazyComp /></Suspense>

// Solid
import { lazy, Suspense } from "solid-js";
const LazyComp = lazy(() => import("./Heavy"));
<Suspense fallback={<Spinner />}><LazyComp /></Suspense>
```

Solid `lazy` returns a component that suspends. Resource APIs differ from React —
Solid uses `createResource` for async data with Suspense integration.

---

## 4. Event & Ref Handling

### 4.1 Event Handlers

```tsx
// React
<button onClick={(e) => handleClick(e)}>Save</button>
<input onChange={(e) => setValue(e.target.value)} />

// Solid — camelCase (delegated) works
<button onClick={(e) => handleClick(e)}>Save</button>
<input onInput={(e) => setValue(e.currentTarget.value)} />
// NOTE: use onInput instead of onChange for input events in Solid
```

Solid supports both `onClick` (delegated, recommended) and `on:click` (real
listener, non-bubbling). Prefer `onClick` for most cases.

### 4.2 Controlled Inputs

```tsx
// React — controlled
<input value={text} onChange={(e) => setText(e.target.value)} />

// Solid — uncontrolled by default, use value + onInput for "controlled"
<input
  value={text()}
  onInput={(e) => setText(e.currentTarget.value)}
/>
```

**Note:** Solid inputs are uncontrolled by default. Passing `value={signal()}`
makes it controlled via the signal. Use `onInput` (not `onChange`) for text inputs.

### 4.3 Refs

```tsx
// React
const ref = useRef<HTMLInputElement>(null);
<input ref={ref} />
ref.current?.focus();

// Solid
let ref: HTMLInputElement | undefined;
<input ref={ref} />
ref?.focus();

// OR signal-based ref
const [ref, setRef] = createSignal<HTMLInputElement>();
<input ref={setRef} />
ref()?.focus();
```

### 4.4 Event Pooling

Not an issue in Solid — synthetic event pooling was a React 16 concept. Solid
events are native DOM events.

---

## 5. Provider & Context Pattern

### 5.1 Context Creation

```tsx
// React
const ThemeContext = createContext<Theme>(defaultTheme);
const useTheme = () => useContext(ThemeContext);

<ThemeContext.Provider value={theme}>
  <App />
</ThemeContext.Provider>

// Solid
import { createContext, useContext } from "solid-js";
const ThemeContext = createContext<Theme>(defaultTheme);
const useTheme = () => useContext(ThemeContext);

<ThemeContext.Provider value={theme()}>
  {props.children}
</ThemeContext.Provider>
```

### 5.2 Provider Stack

```tsx
// React (createLiscaWebApp)
createRoot(container).render(
  <StrictMode>
    <AtomsProvider runtime={runtime}>
      <ShellThemeProvider>
        <ShellServerProvider>
          <ShellWorkspaceProvider>
            <RouterProvider router={router} />
          </ShellWorkspaceProvider>
        </ShellServerProvider>
      </ShellThemeProvider>
    </AtomsProvider>
  </StrictMode>
);

// Solid — NO StrictMode (Solid doesn't have it). render() instead of createRoot.
import { render } from "solid-js/web";
render(
  () => (
    <AtomsProvider runtime={runtime()}>
      <ShellThemeProvider>
        <ShellServerProvider>
          <ShellWorkspaceProvider>
            <RouterProvider router={router} />
          </ShellWorkspaceProvider>
        </ShellServerProvider>
      </ShellThemeProvider>
    </AtomsProvider>
  ),
  container
);
```

### 5.3 createRoot → render

```tsx
// React
import { createRoot } from "react-dom/client";
const root = createRoot(document.getElementById("app")!);
root.render(<App />);

// Solid
import { render } from "solid-js/web";
render(() => <App />, document.getElementById("app")!);
```

**Note:** Solid's `render` takes a function that returns JSX. This function runs
once. All reactivity comes from signals inside.

---

## 6. Router Migration (TanStack)

### 6.1 File Routes

```tsx
// React (@tanstack/react-router)
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/align")({
  component: AlignPage,
  loader: async () => { ... },
});

// Solid (@tanstack/solid-router)
import { createFileRoute } from "@tanstack/solid-router";
export const Route = createFileRoute("/align")({
  component: AlignPage,
  loader: async () => { ... },
});
```

### 6.2 Route Context & Navigation

```tsx
// React
const { params, navigate } = Route.useRouteContext();
const { data } = Route.useLoaderData();

// Solid
const { params, navigate } = Route.useRouteContext();
const { data } = Route.useLoaderData();
// Note: params and data are reactive signals in solid-router — access as params(), data()
```

### 6.3 Link

```tsx
// React
import { Link } from "@tanstack/react-router";
<Link to="/align">Go to Align</Link>

// Solid
import { Link } from "@tanstack/solid-router";
<Link href="/align">Go to Align</Link>
// ⚠️ VERIFY: solid-router may use `to` or `href` — check @tanstack/solid-router d.ts
```

### 6.4 Router Creation

```tsx
// React
import { createRouter, RouterProvider } from "@tanstack/react-router";
const router = createRouter({ routeTree, history: createHashHistory() });
<RouterProvider router={router} />;

// Solid
import { createRouter, RouterProvider } from "@tanstack/solid-router";
const router = createRouter({ routeTree, history: createHashHistory() });
<RouterProvider router={router} />;
```

### 6.5 Router Plugin

```ts
// vite.config.ts — React
tanstackRouter({ target: "react", autoCodeSplitting: true });

// vite.config.ts — Solid
tanstackRouter({ target: "solid", autoCodeSplitting: true });
```

---

## 7. Vite Configuration Changes

### 7.1 Plugin Swap

```ts
// BEFORE (packages/web-app/vite.ts)
import react from "@vitejs/plugin-react";
import { babel } from "@rolldown/plugin-babel";
import reactCompiler from "babel-plugin-react-compiler";

export function liscaReactPlugin() {
  return [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ];
}

// AFTER
import solid from "vite-plugin-solid";

export function liscaSolidPlugin() {
  return solid({
    // solid-plugin options if needed
  });
}
```

### 7.2 createLiscaViteConfig Changes

```ts
// BEFORE
export function createLiscaViteConfig(opts) {
  return defineConfig({
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      liscaReactPlugin(),          // React + React Compiler
      tailwindcss(),
      liscaModelsPlugin(),
    ],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react/compiler-runtime"],
    },
    // ...dev proxy etc
  });
}

// AFTER
export function createLiscaViteConfig(opts) {
  return defineConfig({
    plugins: [
      tanstackRouter({ target: "solid", autoCodeSplitting: true }),
      liscaSolidPlugin(),          // vite-plugin-solid
      tailwindcss(),
      liscaModelsPlugin(),
    ],
    resolve: {
      dedupe: ["solid-js"],
    },
    // optimizeDeps: REMOVE (no compiler-runtime)
    // ...dev proxy etc
  });
}
```

### 7.3 tsconfig Changes

```json
// BEFORE
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}

// AFTER
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "solid-js"
  }
}
```

### 7.4 What to Remove

- `@vitejs/plugin-react`
- `@rolldown/plugin-babel`
- `babel-plugin-react-compiler`
- `react`, `react-dom` (from all package.json deps/peerDeps)
- `@tanstack/react-router` → `@tanstack/solid-router`
- `@effect-atom/atom-react` → `@effect-atom/atom-solid`
- `@base-ui/react` → `@kobalte/core`
- `lucide-react` → `lucide-solid`
- React Compiler lint rules (the ban on useMemo/useCallback/memo is no longer needed — Solid has its own patterns)

### 7.5 What to Add

- `solid-js`
- `vite-plugin-solid`
- `@tanstack/solid-router`
- `@effect-atom/atom-solid` (⚠️ verify it exists on npm with compatible API)
- `@kobalte/core`
- `lucide-solid`
- `@solidjs/testing-library` (for tests)

---

## 8. Tailwind & Styling

### 8.1 Tailwind v4 — UNCHANGED

Tailwind v4 CSS-first configuration is framework-agnostic. The `@tailwindcss/vite`
plugin and `@import "tailwindcss"` in CSS work identically with Solid.

### 8.2 className → class

```tsx
// React
<div className="flex gap-2">...</div>
<button className={cn("btn", isActive && "btn-active")}>...</button>

// Solid — use `class` not `className`
<div class="flex gap-2">...</div>
<button class={cn("btn", isActive() && "btn-active")}>...</button>
```

**CRITICAL:** Every `className` must become `class`. This is the most common
mechanical error. Grep for `className=` and replace with `class=`.

### 8.3 Conditional Classes

`clsx`, `class-variance-authority`, and `tailwind-merge` are all framework-agnostic.
They work unchanged. Just remember to unwrap signals: `isActive()` not `isActive`.

### 8.4 coss-theme.css

`packages/ui/coss-theme.css` with `@theme inline { ... }` is pure CSS — unchanged.

---

## 9. Base UI → Kobalte Migration (12 Primitives)

Each coss primitive in `packages/ui/components/ui/` maps to a Kobalte component.
The vendor files are replaced; the styling wrappers (CVA variants, Tailwind classes)
are preserved.

### 9.1 Button

```tsx
// coss (Base UI)
import { Button as BaseButton } from "@base-ui/react";
export const Button = ({ variant, size, ...props }) => (
  <BaseButton className={cn(buttonVariants({ variant, size }))} {...props} />
);

// Solid + Kobalte
import { Button as KobalteButton } from "@kobalte/core/button";
export const Button = (props) => {
  const [local, rest] = splitProps(props, ["variant", "size", "class"]);
  return (
    <KobalteButton class={cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)} {...rest} />
  );
};
```

### 9.2 Card

```tsx
// Card is just styled divs — no Kobalte needed. Keep as plain Solid components.
export function Card(props) { return <div class={cn(cardVariants(), props.class)} {...props} />; }
export function CardHeader(props) { return <div class={cn(cardHeaderVariants(), props.class)} {...props} />; }
// etc.
```

### 9.3 Field → custom (Kobalte form primitives)

Kobalte doesn't have a single "Field" export. Use:
- `@kobalte/core/text-field` for input fields
- Label from `@kobalte/core/label`
- Validation via `@kobalte/core/form` if form-level validation is needed

### 9.4 Input → Kobalte TextField

```tsx
import { TextField } from "@kobalte/core/text-field";
// Map Base UI Input to Kobalte TextField.Input
```

### 9.5 Label → Kobalte Label

```tsx
import { Label } from "@kobalte/core/label";
```

### 9.6 Menu → Kobalte Menu

```tsx
import { Menu } from "@kobalte/core/menu";
// Menu.Trigger, Menu.Content, Menu.Item, etc.
```

### 9.7 Select → Kobalte Select

```tsx
import { Select } from "@kobalte/core/select";
// Select.Trigger, Select.Value, Select.Content, Select.Item, etc.
```

### 9.8 Separator → plain `<hr>` or Kobalte

```tsx
// Simplest — just a styled hr
export function Separator(props) {
  return <hr class={cn("border-border", props.orientation === "vertical" && "h-full w-px", props.class)} />;
}
// OR Kobalte has Separator in @kobalte/core/separator
```

### 9.9 Slider → Kobalte Slider

```tsx
import { Slider } from "@kobalte/core/slider";
// Slider.Track, Slider.Thumb, etc.
```

### 9.10 Spinner → custom (no library)

Keep as a plain CSS/Tailwind animated element. No Kobalte equivalent needed.

### 9.11 Toggle → Kobalte Switch

```tsx
import { Switch } from "@kobalte/core/switch";
// Map Base UI Toggle to Kobalte Switch
```

### 9.12 ToggleGroup → Kobalte ToggleGroup

```tsx
import { ToggleGroup } from "@kobalte/core/toggle-group";
// ToggleGroup.Item, etc.
```

### CVA Variant Preservation

The CVA variant definitions (buttonVariants, cardVariants, etc.) are pure functions
returning class strings. They are **framework-agnostic** and should NOT change.
Only the component wrapper changes.

---

## 10. Effect Atom Migration

### 10.1 Imports

```tsx
// React
import {
  RegistryProvider,
  useAtom,
  useAtomValue,
  useAtomSet,
  useAtomInitialValues,
} from "@effect-atom/atom-react";

// Solid
import {
  RegistryProvider,
  useAtom,
  useAtomValue,
  useAtomSet,
  useAtomInitialValues,
} from "@effect-atom/atom-solid";
// ⚠️ VERIFY exact export names against atom-solid's type definitions
```

### 10.2 Provider

```tsx
// React
<RegistryProvider runtime={runtime}>
  <App />
</RegistryProvider>

// Solid — children is an accessor
<RegistryProvider runtime={runtime()}>
  {props.children}
</RegistryProvider>
```

### 10.3 Atom Definitions — UNCHANGED

```tsx
// These are framework-agnostic — do NOT modify:
export const myAtom = Atom.make(...);
export const runtime = Atom.runtime(Layer.mergeAll(...));
export const createAppRuntime = () => Atom.runtime(...);
```

The core `@effect-atom/atom` package (not atom-react/atom-solid) contains the
framework-agnostic Atom machinery. Only the *binding* layer changes.

### 10.4 Atom Hooks — Behavior

The hooks should behave the same: `useAtom` returns `[value, setter]`, `useAtomValue`
returns just the value, `useAtomSet` returns just the setter. The difference is that
under the hood they use Solid signals instead of React hooks. The returned `value`
will be a Solid signal accessor (call it: `value()`) not a plain value.

---

## 11. Testing Migration

### 11.1 Playwright — Mostly Unchanged

Playwright tests use `data-testid` selectors and DOM queries — framework-agnostic.
The test files themselves should mostly work unchanged. Updates needed:
- If tests mount React components directly (rare), swap to Solid mounting
- `data-testid` attributes stay the same
- Text content assertions stay the same

### 11.2 Component Tests → @solidjs/testing-library

```tsx
// React
import { render, screen } from "@testing-library/react";
render(<Button variant="default">Save</Button>);
expect(screen.getByText("Save")).toBeInTheDocument();

// Solid
import { render } from "@solidjs/testing-library";
const { getByText } = render(() => <Button variant="default">Save</Button />);
expect(getByText("Save")).toBeInTheDocument();
```

Key differences:
- `render` takes a function returning JSX (not JSX directly)
- No `screen` — `render` returns query helpers directly
- Signal-based props: `() => value` not `value`
- `waitFor` and `act` work differently — check @solidjs/testing-library docs

---

## 12. What Does NOT Need Migration

These are framework-agnostic and should NOT be touched:

| Path | Reason |
|---|---|
| `packages/contracts` | Effect Schema, HttpApi, Rust codegen — pure TS |
| `packages/utils` | Pure domain math/logic — no React |
| `packages/storage` | Storage abstraction — no React |
| `crates/*` (lisca, lisca-tauri) | Rust backend |
| `apps/*/server` | Rust APIs (Axum) |
| `apps/*/desktop/src-tauri` | Tauri shell — hosts web dist regardless of framework |
| `packages/client/src/atoms/*` (definitions) | Framework-agnostic Atom core |
| `packages/client/src/runtime/*` | Effect runtime — framework-agnostic |
| `packages/analysis` (non-atom parts) | CSV/plot parsing, assay catalog — pure TS |
| `package.json` catalog entries for non-React deps | Effect, tailwind, etc. |
| `docker-compose.yml`, `Dockerfile` | Infrastructure |
| `bunfig.toml`, `.mise.toml` | Toolchain config |
| `python/` | Python utilities (uv, Ruff, Typer) |

### What IS being deleted entirely

| Path | Reason |
|---|---|
| `apps/aligner/mobile` | React Native — dropped |
| `apps/annotator/mobile` | React Native — dropped |
| `apps/studio/mobile` | React Native — dropped |
| `packages/ui-native` | React Native UI mirror — dropped |
| `packages/mobile-app` | Expo/React Native bootstrap — dropped |
| All `react-native`, `expo`, `nativewind`, `@shopify/react-native-skia` deps | Mobile stack removed |

---

## 13. Known Gotchas & Common Mistakes

### 13.1 Components Run Once

**This is the #1 mental model difference.** Solid components execute their body
exactly once. They never re-render. All reactivity comes from signals accessed
inside JSX. A component body is setup code, not a render function.

```tsx
// WRONG — this runs once and never updates
function Counter(props) {
  const current = props.count; // captured once, never updates
  return <div>{current}</div>;
}

// RIGHT — signal access in JSX creates reactivity
function Counter(props) {
  return <div>{props.count}</div>; // props.count is reactive (proxy)
}
```

### 13.2 Never Destructure Props

```tsx
// WRONG — loses reactivity
function Comp({ title, items }) {
  return <div>{title}</div>; // title is now static
}

// RIGHT — access props directly
function Comp(props) {
  return <div>{props.title}</div>;
}

// RIGHT — splitProps for extraction
function Comp(props) {
  const [local, rest] = splitProps(props, ["class", "title"]);
  return <div class={local.class}>{rest.title}</div>;
}
```

### 13.3 .map() in JSX

```tsx
// WORKS but creates new array each time the signal updates — inefficient
{items().map((item) => <Row item={item} />)}

// PREFERRED — <For> is optimized for keyed list rendering
<For each={items()}>
  {(item) => <Row item={item} />}
</For>
```

### 13.4 className → class

Every `className` must become `class`. This is the most frequent mechanical error.

### 13.5 Signal Access in Events

```tsx
// React — value is stable
const [count, setCount] = useState(0);
<button onClick={() => setCount(count + 1)}>+</button>

// Solid — must call the getter
const [count, setCount] = createSignal(0);
<button onClick={() => setCount(count() + 1)}>+</button>
```

### 13.6 createEffect vs onMount Timing

- `onMount` — runs once after initial render
- `createEffect` — runs after every signal change (including initial)
- `createRenderEffect` — runs during render phase (rare)

If you only want one-time setup, use `onMount`. If you want reactive tracking,
use `createEffect`.

### 13.7 Spread Props

```tsx
// WRONG — object spread loses reactivity
<Component {...{ foo: props.foo, bar: props.bar }} />

// RIGHT — use mergeProps or spread the proxy directly
<Component {...props} />
// OR
const merged = mergeProps({ defaultProp: "x" }, props);
<Component {...merged} />
```

### 13.8 Event Delegation

Solid uses real event delegation. `onClick` is delegated (one listener at root).
`on:click` adds a real listener to the element. For most cases, `onClick` is fine.
Use `on:click` if you need `stopPropagation` to work against delegated events.

### 13.9 No StrictMode

Solid does not have `StrictMode`. Remove it from the provider stack. Effects do not
double-fire in development.

### 13.10 style Prop

```tsx
// String style — works
<div style="color: red; padding: 4px;">...</div>

// Object style — reactive in Solid (unlike React's non-reactive style objects)
<div style={{ color: theme().color, padding: "4px" }}>...</div>
// In Solid, style object values can be signals and they ARE reactive
```

---

## 14. Trial Run Plan

Before translating all files, start with 3 trial files (same approach as the Bun
blog post). Each trial: 1 implementer translates, 2 adversarial reviewers check
behavior parity + PORTING.md compliance, 1 fixer applies feedback.

### Trial File 1: Simple Presentational Component
Pick one of the 12 coss primitives (e.g., `packages/ui/components/ui/button.tsx`).
Translate to Kobalte Button wrapper. Verify:
- CVA variants unchanged
- `class` replaces `className`
- Props not destructured
- Exports match

### Trial File 2: Stateful Component with Effects
Pick a component from an app (e.g., `apps/studio/web/src/components/some-modal.tsx`).
Translate. Verify:
- useState → createSignal
- useEffect → createEffect / onMount / onCleanup
- Signal getters used correctly
- `<Show>` for conditionals

### Trial File 3: Atom + Router Component
Pick a route component (e.g., `apps/aligner/web/src/routes/align.tsx`). Translate. Verify:
- atom-react → atom-solid imports
- TanStack router createFileRoute import swapped
- Router context hooks work as signals
- Provider stack correct (no StrictMode)

### After Trial Run
Review the 3 translated files manually. If all pass, proceed to batch translation
of the remaining files. If issues found, update PORTING.md with corrections first.

---

## Appendix: Per-File Mechanical Checklist

For each `.tsx` file being translated, the implementer must check:

- [ ] Imports: `react` → `solid-js`, `react-dom/client` → `solid-js/web`
- [ ] Imports: `@tanstack/react-router` → `@tanstack/solid-router`
- [ ] Imports: `@effect-atom/atom-react` → `@effect-atom/atom-solid`
- [ ] Imports: `@base-ui/react` → `@kobalte/core/*`
- [ ] Imports: `lucide-react` → `lucide-solid`
- [ ] `useState(x)` → `createSignal(x)` (and update all reads to `x()`)
- [ ] `useEffect(() => {}, [deps])` → `createEffect(() => {})` or `onMount(() => {})`
- [ ] `useRef(null)` → `let ref: T | undefined` or `createSignal<T>()`
- [ ] `useContext` → `useContext` (Solid's, from `solid-js`)
- [ ] `useMemo` → `createMemo`
- [ ] `useCallback` → removed (plain function)
- [ ] `memo` / `React.memo` → removed
- [ ] Props: NOT destructured (access `props.x` directly or `splitProps`)
- [ ] `className` → `class`
- [ ] `{cond && <X/>}` → `<Show when={cond()}><X/></Show>` (or inline ternary)
- [ ] `{arr.map(x => <X key=... />)}` → `<For each={arr()}>{(x) => <X />}</For>`
- [ ] `createRoot(el).render(<App/>)` → `render(() => <App/>, el)`
- [ ] `<StrictMode>` → removed
- [ ] React Context → Solid Context (recreate with `createContext` from `solid-js`)
- [ ] `forwardRef` → removed (ref is a prop)
- [ ] Error boundary class → `<ErrorBoundary>` component
- [ ] `createPortal` → `<Portal>` from `solid-js/web`
- [ ] React Compiler annotations → removed (not needed)
- [ ] `useEffect` cleanup return → `onCleanup(...)` inside effect
