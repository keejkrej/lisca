import type { Html } from "@effect/ui/html";
import type { AlignGridShape } from "@lisca/contracts";
import { ToggleGroup } from "@lisca/ui/toggle-group";

export type AlignGridShapeToggleOptions<M> = {
  readonly key?: string | undefined;
  readonly shape: AlignGridShape;
  readonly onShapeChange: (shape: AlignGridShape) => M | undefined;
  readonly disabled?: boolean | undefined;
  readonly class?: string | undefined;
};

export type AlignGridShapeToggleProps<M = never> = AlignGridShapeToggleOptions<M>;

export type AlignDetectShape = "auto" | "rect" | "hex";

export type AlignDetectShapeToggleOptions<M> = {
  readonly key?: string | undefined;
  readonly shape: AlignDetectShape;
  readonly onShapeChange: (shape: AlignDetectShape) => M | undefined;
  readonly disabled?: boolean | undefined;
  readonly class?: string | undefined;
};

export type AlignDetectShapeToggleProps<M = never> = AlignDetectShapeToggleOptions<M>;

function toggleValueForShape(shape: AlignGridShape): "rect" | "hex" {
  return shape === "hex" ? "hex" : "rect";
}

export function AlignGridShapeToggle<M>(h: Html.H<M>, options: AlignGridShapeToggleOptions<M>) {
  const value = toggleValueForShape(options.shape);

  return ToggleGroup(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    ariaLabel: "Grid shape",
    class: options.class ?? "w-full min-w-[9rem]",
    disabled: options.disabled,
    size: "sm",
    value: [value],
    variant: "outline",
    items: [
      {
        value: "rect",
        class: "min-w-[4.5rem] flex-1 px-2 text-xs",
        content: "Square",
      },
      {
        value: "hex",
        class: "min-w-[4.5rem] flex-1 px-2 text-xs",
        content: "Hex",
      },
    ],
    onChange: (next) => {
      const selected = next[0];
      if (selected === "rect" || selected === "hex") {
        return options.onShapeChange(selected);
      }
      return undefined;
    },
  });
}

export function AlignDetectShapeToggle<M>(h: Html.H<M>, options: AlignDetectShapeToggleOptions<M>) {
  return ToggleGroup(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    ariaLabel: "Detect shape",
    class: options.class ?? "w-full min-w-[9rem]",
    disabled: options.disabled,
    size: "sm",
    value: [options.shape],
    variant: "outline",
    items: [
      {
        value: "auto",
        class: "min-w-[3rem] flex-1 px-2 text-xs",
        content: "Auto",
      },
      {
        value: "rect",
        class: "min-w-[3rem] flex-1 px-2 text-xs",
        content: "Square",
      },
      {
        value: "hex",
        class: "min-w-[3rem] flex-1 px-2 text-xs",
        content: "Hex",
      },
    ],
    onChange: (next) => {
      const selected = next[0];
      if (selected === "auto" || selected === "rect" || selected === "hex") {
        return options.onShapeChange(selected);
      }
      return undefined;
    },
  });
}
