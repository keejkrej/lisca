import { Button, cn } from "@lisca/ui/components";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Play } from "lucide-react";
import { useState } from "react";

import type { LandingDemo } from "../lib/demos";

/**
 * Frames a live demo inline. The demo bundles pull heavy onnx/transformers wasm,
 * so we mount the component only after an explicit "launch" click to keep the
 * landing page's first paint light.
 */
export function DemoEmbed({ demo, index }: { demo: LandingDemo; index: number }) {
  const [active, setActive] = useState(false);
  const Demo = demo.Demo;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            Demo {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">{demo.title}</h3>
        </div>
        <Link
          to={demo.href}
          className="inline-flex shrink-0 items-center gap-1 rounded-md font-mono text-xs text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Full screen
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </header>

      <p className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">{demo.description}</p>

      <div
        className={cn(
          "relative mx-5 mb-5 h-[32rem] overflow-hidden rounded-xl border border-border",
          !active && "backdrop-micropattern",
        )}
      >
        {active ? (
          <Demo embedded />
        ) : (
          <button
            type="button"
            onClick={() => setActive(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <span
              className="flex size-16 items-center justify-center rounded-full border border-border bg-background/80 shadow-lg transition-transform group-hover:scale-105"
              style={{ boxShadow: "0 0 32px -4px var(--accent-glow)" }}
            >
              <Play className="size-6 translate-x-0.5 text-glow" aria-hidden />
            </span>
            <span className="font-mono text-sm tracking-wide">
              Launch {demo.title} in your browser
            </span>
            <span className="max-w-xs text-center text-xs text-muted-foreground">
              Runs entirely in this tab — no installation, no upload.
            </span>
          </button>
        )}
      </div>
    </article>
  );
}
