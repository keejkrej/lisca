import { Button } from "@lisca/ui/components";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Play } from "lucide-react";
import { useState } from "react";

import type { LandingDemo } from "../lib/demos";

/**
 * Frames a live demo inline. The demo bundles pull heavy onnx/transformers wasm,
 * so we mount the component only after an explicit launch click to keep the
 * landing page's first paint light.
 */
export function DemoEmbed({ demo, index }: { demo: LandingDemo; index: number }) {
  const [active, setActive] = useState(false);
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
          Full screen
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </header>

      <div className="px-5 py-4">
        <p className="min-h-[5lh] text-sm leading-relaxed text-muted-foreground">{demo.description}</p>
      </div>

      <div className="relative mx-5 mb-5 h-[32rem] shrink-0 overflow-hidden rounded-xl border border-border">
        {active ? (
          <Demo embedded />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label={demo.linkLabel}
              onClick={() => setActive(true)}
            >
              <Play aria-hidden />
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
