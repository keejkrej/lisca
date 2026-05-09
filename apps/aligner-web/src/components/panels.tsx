import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Separator,
} from "@lisca/ui";
import type { ReactNode } from "react";

import type { RouteId } from "../types";

function Section(props: { title: string; description?: string; children?: ReactNode }) {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-3 py-3 pb-0">
        <CardTitle className="text-sm">{props.title}</CardTitle>
        {props.description ? (
          <CardDescription className="text-xs">{props.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 pt-2">{props.children}</CardContent>
    </Card>
  );
}

/** Left `AppShell` rail; content depends on `routeId` (align vs inspect each have left + right panels). */
export function LeftPanel(props: { routeId: RouteId }) {
  if (props.routeId === "align") {
    return (
      <div className="flex min-h-0 flex-col gap-2 p-3">
        <Section title="Navigation" description="Frame / channel / Z — placeholders">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Position</Label>
            <div className="rounded-md border border-dashed border-border px-2 py-6 text-center text-muted-foreground text-xs">
              NavigationControls (stub)
            </div>
          </div>
        </Section>
        <Separator />
        <Section title="Grid" description="Pitch, cell size, exclusions — placeholders">
          <div className="rounded-md border border-dashed border-border px-2 py-8 text-center text-muted-foreground text-xs">
            Grid controls (stub)
          </div>
        </Section>
        <Separator />
        <Section title="Timeline" description="Time slider & auto-exclude — placeholders">
          <div className="min-h-0 rounded-xl border border-dashed border-border px-3 py-6 text-center text-muted-foreground text-sm">
            Time slider & auto-exclude chart — stub
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <Section title="Inspect navigation" description="Tile / frame stepping — placeholders">
        <div className="rounded-md border border-dashed border-border px-2 py-6 text-center text-muted-foreground text-xs">
          Inspect navigation (stub)
        </div>
      </Section>
      <Separator />
      <Section title="Appearance" description="Intensity / LUT — placeholders">
        <div className="rounded-md border border-dashed border-border px-2 py-6 text-center text-muted-foreground text-xs">
          View tuning (stub)
        </div>
      </Section>
      <Separator />
      <Section title="Filmstrip" description="Inspect thumbnails — placeholders">
        <div className="min-h-0 rounded-xl border border-dashed border-border px-3 py-6 text-center text-muted-foreground text-sm">
          Thumbnail strip — stub
        </div>
      </Section>
    </div>
  );
}

const bottomSplitDivider = "border-neutral-300 dark:border-neutral-700";

/** `AppShell.Dock` content: contrast (left) and save (right). */
export function BottomPanel(props: { routeId: RouteId }) {
  const contrastSubtitle =
    props.routeId === "align"
      ? "Auto / manual window–level — placeholders"
      : "Inspect intensity / LUT — placeholders";
  const saveHint =
    props.routeId === "align"
      ? "Save bbox CSV, grid preset, etc. — stub"
      : "Persist inspect results — stub";

  return (
    <div className="flex h-full min-h-0 w-full">
      <section
        aria-label="Contrast"
        className={`min-h-0 min-w-0 flex-1 overflow-auto border-r ${bottomSplitDivider}`}
      >
        <div className="flex h-full min-h-0 flex-col gap-2 p-3">
          <div className="text-muted-foreground text-xs uppercase tracking-wide">Contrast</div>
          <div className="min-h-0 flex-1 rounded-xl border border-dashed border-border px-3 py-6 text-center text-muted-foreground text-sm">
            {contrastSubtitle}
          </div>
        </div>
      </section>
      <section aria-label="Save" className="min-h-0 min-w-0 flex-1 overflow-auto">
        <div className="flex h-full min-h-0 flex-col gap-3 p-3">
          <div className="text-muted-foreground text-xs uppercase tracking-wide">Save</div>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-3 py-4">
            <p className="text-center text-muted-foreground text-sm">{saveHint}</p>
            <Button type="button" size="sm" disabled>
              Save
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Center `AppShell` region: viewport / canvas (stub). */
export function MainPanel(props: { routeId: RouteId }) {
  const label = props.routeId === "align" ? "Align canvas" : "Inspect canvas";
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-dashed border-border bg-card/80 px-6 py-10 text-center shadow-sm backdrop-blur-sm">
          <p className="font-medium text-foreground">{label}</p>
          <p className="mt-2 text-muted-foreground text-sm">
            <code className="rounded bg-muted px-1 py-0.5 text-xs">AlignerCanvasSurface</code> and
            backend wiring land here next.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Right `AppShell` rail; content depends on `routeId`. */
export function RightPanel(props: { routeId: RouteId }) {
  const title = props.routeId === "align" ? "Align inspector" : "Inspect inspector";
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <Section title={title} description="Stats & metadata — placeholders">
        <div className="rounded-md border border-dashed border-border px-2 py-10 text-center text-muted-foreground text-xs">
          Inspector stats (stub)
        </div>
      </Section>
    </div>
  );
}
