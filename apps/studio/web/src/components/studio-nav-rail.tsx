import { Link, useNavigate, useRouterState } from "@tanstack/solid-router";
import { createEffect, For, onCleanup, Show, type JSX } from "solid-js";

import { commandModifierHeld } from "../navigation/command-modifier-held";

import {
  STUDIO_PAGES,
  studioHorizontalHistoryArrow,
  studioPageForShortcut,
  studioPageShortcutHint,
  studioPageStepHint,
  studioPageStepTarget,
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
// Each route mounts its own shell; carry the last position into the next rail.
let previousStepIndex: number | undefined;

function stepLabel(index: number): string {
  return STEP_ROMAN[index - 1] ?? String(index);
}

/** Keeps ⌘ and the key in fixed columns so ↑/↓ line up with 1–5. */
function RailChordHint(props: { label: string }) {
  const prefix = props.label.startsWith("⌘") ? "⌘" : props.label.startsWith("Ctrl+") ? "Ctrl+" : "";
  const key = prefix ? props.label.slice(prefix.length) : props.label;
  return (
    <span
      aria-hidden="true"
      class="ml-auto inline-flex shrink-0 items-center text-[10px] font-medium leading-none text-current"
    >
      <span>{prefix}</span>
      <span class="inline-flex w-3 justify-center">{key}</span>
    </span>
  );
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
  const modifier = props.shortcutPlatform === "mac" ? "Meta" : "Control";
  const hint = () => studioPageShortcutHint(props.index, props.shortcutPlatform);

  return (
    <Link
      aria-current={props.active ? "page" : undefined}
      aria-keyshortcuts={`${modifier}+${props.index}`}
      class="group flex h-9 w-full min-w-0 shrink-0 items-center gap-3 bg-transparent pr-3 pl-8 text-left text-foreground outline-none transition-colors focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      classList={{ "hover:bg-secondary": !props.active }}
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
      <span
        aria-hidden="true"
        class="w-7 shrink-0 text-left text-[11px] leading-[14px] tabular-nums"
      >
        {stepLabel(props.index)}
      </span>
      <span class="min-w-0 truncate text-sm leading-[18px] font-medium">{props.children}</span>
      <Show when={commandModifierHeld()}>
        <RailChordHint label={hint()} />
      </Show>
    </Link>
  );
}

export function StudioNavRail() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeId = () => pathname().slice(1) || "assay";
  const activeStepIndex = () =>
    Math.max(
      0,
      STUDIO_PAGES.findIndex((page) => page.to.slice(1) === routeId()),
    );
  const shortcutPlatform = studioPageShortcutPlatform();
  let track: HTMLDivElement | undefined;

  createEffect(() => {
    const next = activeStepIndex();
    const previous = previousStepIndex;
    previousStepIndex = next;
    if (
      previous === undefined ||
      previous === next ||
      !track?.animate ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const animation = track.animate(
      [
        { transform: `translateY(${-previous * 2.5}rem)` },
        { transform: `translateY(${-next * 2.5}rem)` },
      ],
      { duration: 300, easing: "ease-in-out" },
    );
    onCleanup(() => animation.cancel());
  });

  const goTo = (to: StudioRouteTo) => {
    const current = routeId();
    if (current === to.slice(1)) return;
    if (current === "annotate" && !confirmStudioAnnotateLeave()) return;
    studioNavigate(navigate, to);
  };

  createEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      const context = {
        key: event.key,
        editableTarget: isEditableTarget(event.target),
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      };
      if (studioHorizontalHistoryArrow(context, shortcutPlatform)) {
        event.preventDefault();
        return;
      }
      const current = `/${routeId()}` as StudioRouteTo;
      const step = studioPageStepTarget(context, shortcutPlatform, current);
      if (step) {
        event.preventDefault();
        if (!event.repeat && step.to) goTo(step.to);
        return;
      }
      if (event.repeat) return;
      const to = studioPageForShortcut(context, shortcutPlatform);
      if (!to) return;
      event.preventDefault();
      goTo(to);
    };

    window.addEventListener("keydown", onKeyDown, true);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown, true));
  });

  const endHint = (direction: "up" | "down") => (
    <Show when={commandModifierHeld()}>
      <span
        aria-hidden="true"
        class="flex items-center pr-3 pl-8 text-[10px] font-medium leading-none text-foreground"
      >
        <RailChordHint label={studioPageStepHint(direction, shortcutPlatform)} />
      </span>
    </Show>
  );

  return (
    <nav aria-label="Primary" class="flex h-full min-h-0 flex-col justify-center py-2.5">
      <div class="ml-rail-inset flex max-h-full w-rail-content min-h-0 min-w-0 flex-col gap-1">
        <div class="h-3 shrink-0">{endHint("up")}</div>
        <div class="relative h-[22.25rem] min-h-9 shrink overflow-hidden">
          <div
            aria-hidden="true"
            data-slot="studio-step-window"
            class="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-9 -translate-y-1/2 border border-primary"
          />
          {/* The date-wheel track moves under the stationary current-step window. */}
          <div
            data-slot="studio-step-track"
            ref={(element) => {
              track = element;
            }}
            class="absolute inset-x-0 top-1/2 -mt-4.5 flex flex-col gap-1 transition-transform duration-300 ease-in-out motion-reduce:transition-none"
            style={{ transform: `translateY(${-activeStepIndex() * 2.5}rem)` }}
          >
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
        </div>
        <div class="h-3 shrink-0">{endHint("down")}</div>
      </div>
    </nav>
  );
}
