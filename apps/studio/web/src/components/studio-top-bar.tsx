import { ConnectionStatus, ShellThemeToggle, useShellServer } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { StudioExpertToggle } from "./studio-expert-toggle";
import { StudioTaskCenter } from "./studio-task-center";

export function StudioTopBar(props: { showExpert?: boolean }) {
  const server = useShellServer();

  return (
    <div
      aria-label="Studio status bar"
      class="flex h-full w-full items-center justify-between"
      role="region"
    >
      <h1 class="sr-only">LiSCA Studio</h1>
      <div class="flex items-center gap-2">
        <StudioTaskCenter />
        <Show when={props.showExpert}>
          <StudioExpertToggle />
        </Show>
      </div>
      <div class="flex items-center gap-2">
        <ConnectionStatus httpBaseUrl={server.httpBaseUrl} state={server.state} />
        <ShellThemeToggle class="size-7" />
      </div>
    </div>
  );
}
