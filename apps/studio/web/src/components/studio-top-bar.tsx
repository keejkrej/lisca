import { ConnectionStatus, ShellThemeToggle, useShellServer } from "@lisca/ui/shell";
import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import { Show } from "solid-js";

import { setStudioExpertMode, studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import { useStudioCommandShortcut } from "../navigation/use-studio-command-shortcut";
import { StudioExpertToggle } from "./studio-expert-toggle";
import { StudioPageTaskCenter } from "./studio-task-center";

export function StudioTopBar(props: { showExpert?: boolean }) {
  const server = useShellServer();
  const expertMode = useAtomValue(() => studioExpertModeAtom);
  const setExpertMode = useAtomSet(() => studioExpertModeAtom);
  useStudioCommandShortcut("expert", () => true, () => {
    const next = !expertMode();
    setExpertMode(next);
    setStudioExpertMode(next);
  });

  return (
    <div
      aria-label="Studio status bar"
      class="relative flex h-full w-full items-center justify-between"
      role="region"
    >
      <h1 class="sr-only">LiSCA Studio</h1>
      <div class="flex items-center gap-2">
        <StudioPageTaskCenter />
        <Show when={props.showExpert}>
          <StudioExpertToggle />
        </Show>
      </div>
      <span
        aria-hidden="true"
        class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground"
      >
        Studio
      </span>
      <div class="flex items-center gap-2">
        <ConnectionStatus state={server.state} onRetry={server.retry} />
        <ShellThemeToggle class="size-7" />
      </div>
    </div>
  );
}
