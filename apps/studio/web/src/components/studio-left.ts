import type { Html } from "@effect/ui/html";

import { StudioNavRail } from "./studio-nav-rail";

export function StudioLeft<M>(h: Html.H<M>, options?: { readonly key?: string | undefined }) {
  return StudioNavRail(h, {
    key: options?.key ?? "studio-nav-rail",
  });
}
