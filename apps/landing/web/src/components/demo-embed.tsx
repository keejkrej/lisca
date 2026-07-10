import type { LandingDemo } from "../lib/demos";
import { Link } from "@tanstack/solid-router";
import { ArrowUpRight } from "lucide-solid";

/**
 * Inline demo frame — mounts immediately with a preloaded sample frame. File upload
 * and export are disabled here; the link opens the full demo route for your own data.
 */
export function DemoEmbed(props: { demo: LandingDemo; index: number }) {
  const Demo = props.demo.Demo;

  return (
    <article class="flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60">
      <header class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div class="min-w-0">
          <p class="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            Demo {String(props.index + 1).padStart(2, "0")}
          </p>
          <h3 class="mt-1 font-display text-xl font-semibold">{props.demo.title}</h3>
        </div>
        <Link
          to={props.demo.href}
          class="landing-control inline-flex shrink-0 items-center gap-1 px-2 py-1 font-mono text-xs"
        >
          Use your own file
          <ArrowUpRight class="size-3.5" aria-hidden />
        </Link>
      </header>

      <div class="px-5 py-4">
        <p class="min-h-[5lh] text-sm leading-relaxed text-muted-foreground">
          {props.demo.description}
        </p>
      </div>

      <div class="relative mx-5 mb-5 h-[32rem] shrink-0 overflow-hidden rounded-xl border border-border">
        <Demo embedded />
      </div>
    </article>
  );
}