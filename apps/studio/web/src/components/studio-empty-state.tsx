import { Button } from "@lisca/ui/components";
import type { JSX } from "solid-js";
import { Show } from "solid-js";

export function StudioEmptyState(props: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: JSX.Element;
}) {
  return (
    <div class="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div class="max-w-sm space-y-1.5">
        <p class="font-medium text-foreground">{props.title}</p>
        <p class="text-sm leading-relaxed text-muted-foreground">{props.description}</p>
      </div>
      <Show when={props.actionLabel && props.onAction}>
        <Button size="sm" type="button" variant="outline" onClick={props.onAction}>
          {props.actionLabel}
        </Button>
      </Show>
      {props.children}
    </div>
  );
}
