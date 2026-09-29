import { cn } from "@lisca/ui/components";
import { Link, useNavigate, useRouterState } from "@tanstack/solid-router";
import { createEffect, For, onCleanup, type JSX } from "solid-js";

import {
  STUDIO_PAGES,
  studioPageForShortcut,
  studioPageShortcutPlatform,
  type StudioPageShortcutPlatform,
} from "../navigation/studio-page-shortcuts";
import { studioNavigate, type StudioRouteTo } from "../navigation/use-studio-navigate";
import { confirmStudioAnnotateLeave } from "../state/studio-annotate-guard";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

const STEP_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;

function stepLabel(index: number): string {
  return STEP_ROMAN[index - 1] ?? String(index);
}

function NavButton(props: {
  active: boolean;
  children: JSX.Element;
  index: number;
  shortcutPlatform: StudioPageShortcutPlatform;
  to: StudioRouteTo;
  onClick?: () => void;
  leaveAnnotateGuard?: boolean;
}) {
  const navigate = useNavigate();
  const shortcutKey =
    props.shortcutPlatform === "mac" ? `Meta+${props.index}` : `Control+${props.index}`;

  return (
    <Link
      aria-current={props.active ? "page" : undefined}
      aria-keyshortcuts={shortcutKey}
      class={cn(
        "group flex h-9 w-full min-w-0 shrink-0 items-center gap-3 rounded-md text-left outline-none transition-colors",
        "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        props.active ? "text-foreground" : "text-muted-foreground",
      )}
      to={props.to}
      onClick={(event) => {
        props.onClick?.();
        if (event.defaultPrevented) return;
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        if (props.leaveAnnotateGuard && props.to !== "/annotate" && !confirmStudioAnnotateLeave()) {
          return;
        }
        studioNavigate(navigate, props.to);
      }}
    >
      <span aria-hidden="true" class={cn("h-4 w-0.5 shrink-0", props.active && "bg-primary")} />
      <span
        aria-hidden="true"
        class={cn(
          "w-[22px] shrink-0 text-[11px] leading-[14px] tabular-nums",
          props.active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {stepLabel(props.index)}
      </span>
      <span
        class={cn(
          "min-w-0 truncate text-sm leading-[18px]",
          props.active ? "font-semibold" : "font-normal",
        )}
      >
        {props.children}
      </span>
    </Link>
  );
}

export function StudioNavRail() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeId = () => pathname().slice(1) || "assay";
  const shortcutPlatform = studioPageShortcutPlatform();

  const goTo = (to: StudioRouteTo) => {
    const current = routeId();
    if (current === to.slice(1)) return;
    if (current === "annotate" && !confirmStudioAnnotateLeave()) return;
    studioNavigate(navigate, to);
  };

  createEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing) return;
      const to = studioPageForShortcut(
        {
          key: event.key,
          editableTarget: isEditableTarget(event.target),
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        },
        shortcutPlatform,
      );
      if (!to) return;
      event.preventDefault();
      goTo(to);
    };

    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  return (
    <nav
      aria-label="Primary"
      class="flex h-full min-h-0 flex-col items-center justify-center px-7 py-2.5"
    >
      <div class="flex w-fit min-w-0 shrink-0 flex-col">
        <For each={STUDIO_PAGES}>
          {(page) => (
            <NavButton
              active={routeId() === page.to.slice(1)}
              index={page.index}
              leaveAnnotateGuard={routeId() === "annotate"}
              shortcutPlatform={shortcutPlatform}
              to={page.to}
            >
              {page.label}
            </NavButton>
          )}
        </For>
      </div>
    </nav>
  );
}
