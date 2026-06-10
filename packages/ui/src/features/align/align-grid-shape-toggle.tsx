"use client";

import type { AlignGridShape } from "@lisca/contracts";

import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";

export type AlignGridShapeToggleProps = {
  shape: AlignGridShape;
  onShapeChange: (shape: AlignGridShape) => void;
  disabled?: boolean;
  className?: string;
};

function toggleValueForShape(shape: AlignGridShape): "rect" | "hex" {
  return shape === "hex" ? "hex" : "rect";
}

export function AlignGridShapeToggle({
  shape,
  onShapeChange,
  disabled,
  className,
}: AlignGridShapeToggleProps) {
  const value = toggleValueForShape(shape);

  return (
    <ToggleGroup
      aria-label="Grid shape"
      className={className ?? "w-full min-w-[9rem]"}
      disabled={disabled}
      multiple={false}
      size="sm"
      value={[value]}
      variant="outline"
      onValueChange={(next) => {
        const selected = next[0];
        if (selected === "rect" || selected === "hex") {
          onShapeChange(selected);
        }
      }}
    >
      <ToggleGroupItem className="min-w-[4.5rem] flex-1 px-2 text-xs" value="rect">
        Square
      </ToggleGroupItem>
      <ToggleGroupItem className="min-w-[4.5rem] flex-1 px-2 text-xs" value="hex">
        Hex
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
