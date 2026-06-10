import type { AlignGridShape } from "@lisca/contracts";

import { SegmentedToggle } from "../../shell/chrome/buttons";

export type AlignGridShapeToggleProps = {
  shape: AlignGridShape;
  onShapeChange: (shape: AlignGridShape) => void;
  disabled?: boolean;
};

function toggleValueForShape(shape: AlignGridShape): "rect" | "hex" {
  return shape === "hex" ? "hex" : "rect";
}

export function AlignGridShapeToggle({
  shape,
  onShapeChange,
  disabled,
}: AlignGridShapeToggleProps) {
  const value = toggleValueForShape(shape);

  return (
    <SegmentedToggle
      disabled={disabled}
      options={[
        { value: "rect", label: "Square" },
        { value: "hex", label: "Hex" },
      ]}
      value={value}
      onChange={(next) => {
        if (next === "rect" || next === "hex") {
          onShapeChange(next);
        }
      }}
    />
  );
}
