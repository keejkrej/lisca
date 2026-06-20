import type { LandingDemo } from "../lib/demos";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

/**
 * Inline demo frame — mounts immediately with a preloaded sample frame. File upload
 * and export are disabled here; the link opens the full demo route for your own data.
 */
export function DemoEmbed({ demo, index }: { demo: LandingDemo; index: number }) {
  const Demo = demo.Demo;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60">
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            Demo {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">{demo.title}</h3>
        </div>
        <Link
          to={demo.href}
          className="landing-control inline-flex shrink-0 items-center gap-1 px-2 py-1 font-mono text-xs"
        >
          Use your own file
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </header>

      <div className="px-5 py-4">
        <p className="min-h-[5lh] text-sm leading-relaxed text-muted-foreground">
          {demo.description}
        </p>
      </div>

      <div className="relative mx-5 mb-5 h-[32rem] shrink-0 overflow-hidden rounded-xl border border-border">
        <Demo embedded />
      </div>
    </article>
  );
}
