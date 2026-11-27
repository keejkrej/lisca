import type { View } from "@effect/ui";
import type { Html } from "@effect/ui/html";

import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { ShellLayoutProvider } from "./shell-layout-context";
import { ShellPanelToggle, ShellPortraitPanelControls } from "./shell-portrait-panels";

const shellDivider = "border-border";
const shellSurface = "bg-paper";
const shellSheetSurface =
  "rounded-none border border-rule border-solid bg-paper [border-width:1px]";

/** Fixed-height dock strip (`11rem`); scrolls inside if content overflows. */
const shellDockFixed = "flex h-[11rem] shrink-0 flex-col overflow-hidden";

function SkipToMainLink<M>(h: Html.H<M>) {
  return h.a
    .class(
      "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
    )
    .attr("href", "#main-content")
    .children("Skip to main content");
}

function renderSidebarInner<M, R = never>(
  h: Html.H<M>,
  side: "left" | "right",
  content: View.Input<M, R>,
  widthClass?: string,
) {
  return h.aside
    .attr("aria-label", side === "left" ? "Left panel" : "Right panel")
    .class(
      cn("flex h-full min-h-0 shrink-0 flex-col overflow-hidden bg-stage", widthClass ?? "w-rail"),
    )
    .children(content);
}

export type AppShellOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly left?: View.Input<M, R> | undefined;
  readonly leftWidthClass?: string | undefined;
  readonly right?: View.Input<M, R> | undefined;
  readonly rightWidthClass?: string | undefined;
  readonly topBar?: View.Input<M, R> | undefined;
  readonly topBarClass?: string | undefined;
  readonly main: View.Input<M, R>;
  readonly dock?: View.Input<M, R> | undefined;
  readonly dockClass?: string | undefined;
};

/**
 * Full-viewport instrument layout: muted stage surround, 16px gutters, floating paper
 * main sheet, 256px rails, and a 56px `TopBar`.
 *
 * In portrait, or when the stage cannot preserve a usable center workspace, left/right panels
 * collapse and open as overlays above main.
 */
function AppShellRoot<M, R = never>(h: Html.H<M>, options: AppShellOptions<M, R>) {
  const hasLeftPanels =
    options.left !== undefined && options.left !== null && options.left !== false;
  const hasRightPanels =
    options.right !== undefined && options.right !== null && options.right !== false;

  return ShellLayoutProvider(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      hasLeftPanels,
      hasRightPanels,
    },
    view: (layout) =>
      h.div
        .class(
          "lisca-instrument-shell flex h-full min-h-0 flex-col overflow-clip overscroll-none bg-stage py-4 text-xs leading-4 text-foreground",
        )
        .children(
          SkipToMainLink(h),
          h.div.class("relative flex min-h-0 flex-1 overflow-hidden bg-stage").children(
            !layout.isPortrait && hasLeftPanels
              ? renderSidebarInner(h, "left", options.left, options.leftWidthClass).key("left-rail")
              : undefined,
            AppShellMainColumn(h, {
              children: [
                options.topBar !== undefined
                  ? AppShellTopBar(h, {
                      class: options.topBarClass,
                      children: options.topBar,
                    }).key("top-bar")
                  : undefined,
                AppShellMain(h, {
                  children: options.main,
                }).key("main"),
                options.dock !== undefined
                  ? AppShellDock(h, {
                      class: options.dockClass,
                      children: options.dock,
                    }).key("dock")
                  : undefined,
              ],
            }).key("main-column"),
            !layout.isPortrait && hasRightPanels
              ? renderSidebarInner(h, "right", options.right, options.rightWidthClass).key(
                  "right-rail",
                )
              : undefined,
            layout.isPortrait && (layout.leftOpen || layout.rightOpen)
              ? layout
                  .closeOverlayButton(h.button)
                  .key("portrait-scrim")
                  .attr("type", "button")
                  .attr("aria-label", "Close side panels")
                  .class("absolute inset-0 z-40 bg-black/55")
              : undefined,
            layout.isPortrait && hasLeftPanels
              ? h.aside
                  .key("portrait-left-aside")
                  .attr("aria-hidden", layout.leftOpen ? "false" : "true")
                  .attr("aria-label", "Left panel")
                  .attr("inert", layout.leftOpen ? undefined : "")
                  .class(
                    cn(
                      "absolute inset-y-0 left-0 z-50 flex max-w-[min(100%,20rem)] flex-col bg-stage shadow-xl transition-transform duration-200 ease-out",
                      layout.leftOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
                    ),
                  )
                  .children(
                    ScrollArea(h, {
                      key: "portrait-left",
                      class: "min-h-0 flex-1",
                      contentClass: "flex h-full flex-col",
                      viewportClass: "overscroll-none",
                      children: h.div
                        .class(
                          cn("flex min-h-0 flex-1 flex-col", options.leftWidthClass ?? "w-rail"),
                        )
                        .children(options.left),
                    }),
                  )
              : undefined,
            layout.isPortrait && hasRightPanels
              ? h.aside
                  .key("portrait-right-aside")
                  .attr("aria-hidden", layout.rightOpen ? "false" : "true")
                  .attr("aria-label", "Right panel")
                  .attr("inert", layout.rightOpen ? undefined : "")
                  .class(
                    cn(
                      "absolute inset-y-0 right-0 z-50 flex max-w-[min(100%,20rem)] flex-col bg-stage shadow-xl transition-transform duration-200 ease-out",
                      layout.rightOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
                    ),
                  )
                  .children(
                    ScrollArea(h, {
                      key: "portrait-right",
                      class: "min-h-0 flex-1",
                      contentClass: "flex h-full flex-col",
                      viewportClass: "overscroll-none",
                      children: h.div
                        .class(
                          cn("flex min-h-0 flex-1 flex-col", options.rightWidthClass ?? "w-rail"),
                        )
                        .children(options.right),
                    }),
                  )
              : undefined,
          ),
        ),
  });
}

/** Floating 56px header surface. Place it inside `MainColumn`. */
export function AppShellTopBar<M, R = never>(
  h: Html.H<M>,
  options: {
    readonly class?: string | undefined;
    readonly children?: View.Input<M, R> | undefined;
  },
) {
  return h.div
    .attr("data-slot", "app-shell-top-bar")
    .class(
      cn(
        "flex h-topbar w-full shrink-0 flex-col overflow-hidden px-5",
        shellSheetSurface,
        options.class,
      ),
    )
    .children(
      ScrollArea(h, {
        key: "top-bar-scroll",
        class: "min-h-0 flex-1",
        contentClass: "h-full",
        viewportClass: "overscroll-none",
        children: options.children,
      }),
    );
}

/** Center stack: floating `TopBar`, paper `Main`, optional `Dock`. */
export function AppShellMainColumn<M, R = never>(
  h: Html.H<M>,
  options: { readonly children?: View.Input<M, R> | undefined },
) {
  return h.div
    .class("flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-visible bg-stage")
    .children(options.children);
}

export function AppShellMain<M, R = never>(
  h: Html.H<M>,
  options: { readonly children?: View.Input<M, R> | undefined },
) {
  return h.main
    .attr("id", "main-content")
    .class(cn("relative flex min-h-0 min-w-0 flex-1 flex-col overflow-clip", shellSheetSurface))
    .children(
      options.children,
      ShellPortraitPanelControls(h, { key: "portrait-controls", props: { placement: "top" } }),
    );
}

/**
 * Full-sheet document scrolling with a separately constrained content measure.
 */
export function AppShellMainScroll<M, R = never>(
  h: Html.H<M>,
  options: {
    readonly key?: string | undefined;
    readonly class?: string | undefined;
    readonly contentClass?: string | undefined;
    readonly children?: View.Input<M, R> | undefined;
  },
) {
  return h.div
    .attr("data-slot", "app-shell-main-scroll")
    .class(cn("h-full min-h-0 min-w-0 w-full flex-1", options.class))
    .children(
      ScrollArea(h, {
        ...(options.key !== undefined ? { key: options.key } : {}),
        class: "h-full min-h-0 min-w-0 w-full flex-1",
        contentClass: cn("mx-auto flex w-full min-w-0 shrink-0 flex-col", options.contentClass),
        viewportClass: "overflow-x-hidden overscroll-none",
        children: options.children,
      }),
    );
}

export function AppShellDock<M, R = never>(
  h: Html.H<M>,
  options: {
    readonly class?: string | undefined;
    readonly children?: View.Input<M, R> | undefined;
  },
) {
  return h.div
    .attr("role", "region")
    .attr("aria-label", "Dock")
    .class(cn(shellDockFixed, "border-t", shellDivider, shellSurface, options.class))
    .children(
      ScrollArea(h, {
        key: "dock-scroll",
        class: "min-h-0 flex-1",
        contentClass: "h-full",
        viewportClass: "overscroll-none",
        children: options.children,
      }),
    );
}

export type AppShellCompound = typeof AppShellRoot & {
  readonly TopBar: typeof AppShellTopBar;
  readonly MainColumn: typeof AppShellMainColumn;
  readonly Main: typeof AppShellMain;
  readonly MainScroll: typeof AppShellMainScroll;
  readonly Dock: typeof AppShellDock;
};

export const AppShell: AppShellCompound = Object.assign(AppShellRoot, {
  TopBar: AppShellTopBar,
  MainColumn: AppShellMainColumn,
  Main: AppShellMain,
  MainScroll: AppShellMainScroll,
  Dock: AppShellDock,
});

export { ShellLayoutProvider, ShellLayoutReceives } from "./shell-layout-context";
export { ShellPanelToggle, ShellPortraitPanelControls };
