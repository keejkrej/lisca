import type { View } from "@effect/ui";
import type { Html } from "@effect/ui/html";
import { Button } from "@lisca/ui/primitives";

export type StudioEmptyStateOptions<M, R = never> = {
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string | undefined;
  readonly onAction?: M | undefined;
  readonly children?: View.Input<M, R> | undefined;
};

export function StudioEmptyState<M, R = never>(
  h: Html.H<M>,
  options: StudioEmptyStateOptions<M, R>,
) {
  return h.div
    .class(
      "flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-6 py-10 text-center",
    )
    .children(
      h.div
        .class("max-w-sm space-y-1.5")
        .children(
          h.p.class("font-medium text-foreground").children(options.title),
          h.p.class("text-sm leading-relaxed text-muted-foreground").children(options.description),
        ),
      options.actionLabel && options.onAction !== undefined
        ? Button(h, {
            size: "sm",
            type: "button",
            variant: "outline",
            onPress: options.onAction,
          }).children(options.actionLabel)
        : undefined,
      options.children,
    );
}
