import type { ComponentProps, JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../../lib/utils";

export type RailControlLayoutProps = ComponentProps<"div">;
export type RailActionPairProps = Omit<ComponentProps<"div">, "aria-label"> & {
  /** Accessible task-scope name shared by the pair, such as History or Bulk exclusion. */
  label: string;
};
export type RailSidebarProps = Omit<ComponentProps<"div">, "children" | "style"> & {
  children?: JSX.Element;
};

/**
 * Full-width stage-rail scroller with a physically centered 200px section measure.
 *
 * The scroller owns the complete 256px rail. Stable gutters reserve matching space on both
 * edges when the platform uses non-overlay scrollbars, so overflow never narrows the section
 * measure or makes adaptive action/field pairs collapse unexpectedly.
 */
export function RailSidebar(props: RailSidebarProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div
      {...others}
      class={cn(
        "flex h-full w-full min-h-0 flex-col items-center overflow-y-auto py-2.5",
        local.class,
      )}
      data-rail-layout="sidebar"
      data-slot="rail-sidebar-scroll"
      style={{ "scrollbar-gutter": "stable both-edges" }}
    >
      <RailSectionStack class="my-auto w-[200px] shrink-0">{local.children}</RailSectionStack>
    </div>
  );
}

/** Canonical 16px rhythm between independently collapsible stage-rail sections. */
export function RailSectionStack(props: RailControlLayoutProps) {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      {...others}
      class={cn("flex w-full min-w-0 flex-col items-stretch gap-4", local.class)}
      data-rail-layout="section-stack"
      data-slot="rail-section-stack"
    />
  );
}

/** Default composition for independent controls in the 200px instrument rail. */
export function RailControlStack(props: RailControlLayoutProps) {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      {...others}
      class={cn("flex w-full min-w-0 flex-col gap-2", local.class)}
      data-rail-layout="stack"
      data-slot="rail-control-stack"
    />
  );
}

/** Two short, product-authored actions with one task scope; never use for dynamic labels. */
export function RailActionPair(props: RailActionPairProps) {
  const [local, others] = splitProps(props, ["class", "label"]);

  return (
    <div
      {...others}
      aria-label={local.label}
      class={cn(
        "grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(6rem,100%),1fr))] gap-2",
        local.class,
      )}
      data-rail-layout="action-pair"
      data-slot="rail-action-pair"
      role="group"
    />
  );
}

/**
 * A semantic pair of peer fields (X/Y or Width/Height).
 * Two 96px cells fit at the canonical 200px rail measure; narrower containers stack them.
 */
export function RailFieldPair(props: RailControlLayoutProps) {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      {...others}
      class={cn(
        "grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(6rem,100%),1fr))] gap-2",
        local.class,
      )}
      data-rail-layout="field-pair"
      data-slot="rail-field-pair"
    />
  );
}
