import { useMemo } from "react";
import { Effect } from "effect";
import { Button } from "lisca/shared/ui";

import { useStudioStore } from "./studioStore";

export default function App() {
  const count = useStudioStore((s) => s.count);
  const increment = useStudioStore((s) => s.increment);

  const banner = useMemo(
    () =>
      Effect.runSync(
        Effect.map(Effect.succeed("LISCA Studio"), (label) => `${label} · Effect + Zustand + shared UI`),
      ),
    [],
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-foreground">
      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <p className="text-lg font-medium tracking-tight">{banner}</p>
        <p className="text-sm text-muted-foreground">
          Blank shell: extend the Rust backend and wire Tauri commands when you add studio-specific behavior.
        </p>
      </div>
      <Button type="button" variant="secondary" onClick={increment}>
        Count: {count}
      </Button>
    </div>
  );
}
