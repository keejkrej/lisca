import { Button } from "lisca/shared/ui";
import type { AlignPatternToolMode } from "lisca/shared/react";
import { Move, RotateCw, Search } from "lucide-react";

import { studioNavItemButtonClass } from "./studioNavItemButtonClass";

const tools: {
  mode: AlignPatternToolMode;
  label: string;
  Icon: typeof Move;
}[] = [
  { mode: "pan", label: "Pan", Icon: Move },
  { mode: "rotate", label: "Rotate", Icon: RotateCw },
  { mode: "zoom", label: "Zoom", Icon: Search },
];

export function AlignPatternCommandToolbar({
  mode,
  onModeChange,
}: {
  mode: AlignPatternToolMode;
  onModeChange: (mode: AlignPatternToolMode) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-3"
      role="toolbar"
      aria-label="Align canvas tools"
    >
      {tools.map(({ mode: m, label, Icon }) => (
        <Button
          key={m}
          type="button"
          variant="ghost"
          className={studioNavItemButtonClass(mode === m, "compact")}
          aria-pressed={mode === m}
          aria-label={label}
          title={label}
          onClick={() => {
            onModeChange(m);
          }}
        >
          <Icon className="size-6 shrink-0 stroke-[1.75]" aria-hidden />
        </Button>
      ))}
    </div>
  );
}
