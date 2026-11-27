import type { Html } from "@effect/ui/html";
import { PanelSection } from "@lisca/ui/patterns";

export type StudioAnalysisExpertOptions = {
  readonly key?: string | undefined;
  readonly assayId: string | null;
  readonly fileCount: number;
};

export function StudioAnalysisExpert<M>(h: Html.H<M>, options: StudioAnalysisExpertOptions) {
  return PanelSection(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    appearance: "rail",
    title: "Analysis",
    children: h.div
      .class("flex flex-col gap-1 text-[13px] leading-[18px]")
      .children(
        h.div
          .class("flex items-center justify-between gap-3")
          .children(
            h.span.class("text-muted-foreground").children("Assay"),
            h.span.class("min-w-0 truncate font-medium").children(options.assayId ?? "—"),
          ),
        h.div
          .class("flex items-center justify-between gap-3")
          .children(
            h.span.class("text-muted-foreground").children("Files"),
            h.span.class("font-medium tabular-nums").children(String(options.fileCount)),
          ),
      ),
  });
}
