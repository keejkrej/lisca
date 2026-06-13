import type { AlignGridShape } from "@lisca/contracts";

import { Text } from "../../../components/ui/text";
import { ToggleGroup, ToggleGroupItem } from "../../../components/ui/toggle-group";

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
      className={className ?? "w-full min-w-[9rem]"}
      disabled={disabled}
      type="single"
      size="sm"
      value={value}
      variant="outline"
      onValueChange={(next) => {
        if (next === "rect" || next === "hex") {
          onShapeChange(next);
        }
      }}
    >
      <ToggleGroupItem className="min-w-[4.5rem] flex-1 px-2 text-xs" isFirst value="rect">
        <Text className="text-xs">Square</Text>
      </ToggleGroupItem>
      <ToggleGroupItem className="min-w-[4.5rem] flex-1 px-2 text-xs" isLast value="hex">
        <Text className="text-xs">Hex</Text>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
