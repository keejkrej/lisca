import type { AlignGridShape } from "@lisca/contracts";

import { ToggleGroup, ToggleGroupItem } from "@lisca/ui/toggle-group";

export type AlignGridShapeToggleProps = {
  shape: AlignGridShape;
  onShapeChange: (shape: AlignGridShape) => void;
  disabled?: boolean;
  class?: string;
};

export type AlignDetectShape = "auto" | "rect" | "hex";

export type AlignDetectShapeToggleProps = {
  shape: AlignDetectShape;
  onShapeChange: (shape: AlignDetectShape) => void;
  disabled?: boolean;
  class?: string;
};

function toggleValueForShape(shape: AlignGridShape): "rect" | "hex" {
  return shape === "hex" ? "hex" : "rect";
}

export function AlignGridShapeToggle(props: AlignGridShapeToggleProps) {
  const value = () => toggleValueForShape(props.shape);

  return (
    <ToggleGroup
      aria-label="Grid shape"
      class={props.class ?? "w-full min-w-[9rem]"}
      disabled={props.disabled}
      size="sm"
      value={value()}
      variant="outline"
      onChange={(next) => {
        const selected = typeof next === "string" ? next : next?.[0];
        if (selected === "rect" || selected === "hex") {
          props.onShapeChange(selected);
        }
      }}
    >
      <ToggleGroupItem class="min-w-[4.5rem] flex-1 px-2 text-xs" value="rect">
        Square
      </ToggleGroupItem>
      <ToggleGroupItem class="min-w-[4.5rem] flex-1 px-2 text-xs" value="hex">
        Hex
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function AlignDetectShapeToggle(props: AlignDetectShapeToggleProps) {
  return (
    <ToggleGroup
      aria-label="Detect shape"
      class={props.class ?? "w-full min-w-[9rem]"}
      disabled={props.disabled}
      size="sm"
      value={props.shape}
      variant="outline"
      onChange={(next) => {
        const selected = typeof next === "string" ? next : next?.[0];
        if (selected === "auto" || selected === "rect" || selected === "hex") {
          props.onShapeChange(selected);
        }
      }}
    >
      <ToggleGroupItem class="min-w-[3rem] flex-1 px-2 text-xs" value="auto">
        Auto
      </ToggleGroupItem>
      <ToggleGroupItem class="min-w-[3rem] flex-1 px-2 text-xs" value="rect">
        Square
      </ToggleGroupItem>
      <ToggleGroupItem class="min-w-[3rem] flex-1 px-2 text-xs" value="hex">
        Hex
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
