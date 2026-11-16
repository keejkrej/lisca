import { slider } from "@ui-sdk/core/slider";
import { splitProps, type JSX } from "solid-js";
import { createParts, usePart } from "../../lib/ui-sdk";
import { cn } from "../../lib/utils";

const parts = createParts(slider, {
  root: "div",
  control: "div",
  track: "div",
  indicator: "div",
  value: "output",
  input: "input",
});

export function Slider(props: {
  class?: string;
  controlClassName?: string;
  children?: JSX.Element;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueCommitted?: (value: number) => void;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  step?: number;
  name?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-valuetext"?: string;
}): JSX.Element {
  const safeMin = () => props.min ?? 0;
  const safeMax = () => Math.max(props.max ?? 100, safeMin() + 1);
  const clampedValue = () => Math.min(Math.max(props.value, safeMin()), safeMax());
  return (
    <parts.Root
      class={cn("data-[orientation=horizontal]:w-full", props.class)}
      id={props.id}
      name={props.name}
      value={clampedValue()}
      defaultValue={props.defaultValue}
      min={safeMin()}
      max={safeMax()}
      step={props.step}
      disabled={props.disabled}
      orientation={props.orientation}
      format={props["aria-valuetext"] == null ? undefined : () => props["aria-valuetext"] ?? ""}
      onValueChange={(next: number | number[]) =>
        props.onValueChange?.(Array.isArray(next) ? (next[0] ?? 0) : next)
      }
      onValueCommit={(next: number | number[]) =>
        props.onValueCommitted?.(Array.isArray(next) ? (next[0] ?? 0) : next)
      }
    >
      {props.children}
      <parts.Control
        class={cn(
          "flex items-center touch-none select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:min-w-44 data-[orientation=vertical]:flex-col data-disabled:pointer-events-none data-disabled:opacity-64",
          props.controlClassName,
        )}
      >
        <parts.Track class="relative grow select-none before:absolute before:rounded-none before:bg-input data-[orientation=horizontal]:h-1 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1 data-[orientation=horizontal]:mx-2.5 data-[orientation=horizontal]:sm:mx-2 data-[orientation=horizontal]:before:inset-x-0.5 data-[orientation=vertical]:before:inset-x-0 data-[orientation=horizontal]:before:inset-y-0 data-[orientation=vertical]:before:inset-y-0.5">
          <parts.Indicator class="select-none rounded-none bg-primary data-[orientation=horizontal]:ms-0.5 data-[orientation=vertical]:mb-0.5" />
          <SliderThumb
            aria-label={props["aria-label"]}
            aria-labelledby={props["aria-labelledby"]}
            aria-describedby={props["aria-describedby"]}
          />
        </parts.Track>
      </parts.Control>
      <parts.Input />
    </parts.Root>
  );
}

function SliderThumb(
  props: Pick<
    JSX.InputHTMLAttributes<HTMLInputElement>,
    "aria-label" | "aria-labelledby" | "aria-describedby"
  >,
) {
  return usePart(
    slider,
    "thumb",
    () => ({ index: 0, id: "0" }),
    {
      class:
        "block size-4 shrink-0 select-none rounded-none border border-input bg-white not-dark:bg-clip-padding shadow-xs/5 outline-none transition-[box-shadow,scale] before:absolute before:inset-0 before:rounded-none before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 data-dragging:scale-120 dark:border-background dark:has-focus-visible:ring-ring/48 [:has(*:focus-visible),[data-dragging]]:shadow-none",
      get children() {
        return usePart(slider, "thumb-input", () => ({ index: 0, id: "0" }), props, "input");
      },
    },
    "div",
  );
}

export function SliderValue(props: { class?: string }): JSX.Element {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <parts.Value class={cn("flex justify-end text-sm", local.class)} {...rest}>
      {(state: { text: string }) => state.text}
    </parts.Value>
  );
}
