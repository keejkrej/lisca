import type { Html } from "@effect/ui/html";

import { cn } from "../lib/utils";
import { PHOSPHOR_ICON_PATHS, type PhosphorIconName } from "./phosphor-paths";

export { PHOSPHOR_ICON_PATHS, type PhosphorIconName } from "./phosphor-paths";

export type IconOptions = {
  readonly class?: string | undefined;
  readonly ariaLabel?: string | undefined;
};

/**
 * Renders a Phosphor SVG icon via `@effect/ui/html` using `h.el("svg")`.
 * Inherits text color via `fill="currentColor"` and defaults to `size-4`.
 */
export function Icon<M>(h: Html.H<M>, name: PhosphorIconName, options: IconOptions = {}) {
  const paths = PHOSPHOR_ICON_PATHS[name];
  const attrs: Record<string, string> = {
    viewBox: "0 0 256 256",
    fill: "currentColor",
    class: cn("shrink-0", options.class ?? "size-4"),
    "data-lisca-icon": name,
  };
  if (options.ariaLabel) {
    attrs["role"] = "img";
    attrs["aria-label"] = options.ariaLabel;
  } else {
    attrs["aria-hidden"] = "true";
  }
  return h
    .el("svg")
    .attrs(attrs)
    .children(paths.map((d, index) => h.el("path").key(String(index)).attrs({ d })));
}
