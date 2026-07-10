import type { AlignGridShape } from "@lisca/contracts";

import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";

export type AlignGridShapeToggleProps = {
  shape: AlignGridShape;
  onShapeChange: (shape: AlignGridShape) => void;
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
      multiple={false}
      size="sm"
      value={[value()]}
      variant="outline"
      onValueChange={(next) => {
        const selected = next[0];
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