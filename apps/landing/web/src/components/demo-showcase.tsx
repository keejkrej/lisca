import { Button } from "@lisca/ui/components";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@lisca/ui/components";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { landingDemos } from "../lib/demos";

export function DemoShowcase() {
  return (
    <section className="scroll-mt-20 border-t border-border/60 py-20 sm:py-28" id="demos">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            Try it with your microscopy files
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Open a PNG or TIFF from a fixed endpoint or timelapse on patterned cultures. These
            interactive previews show the alignment and annotation steps you would run after
            imaging — no account or lab server required.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-12">
          {landingDemos.map((demo) => (
            <Card className="overflow-hidden" key={demo.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <demo.icon aria-hidden className="size-5 opacity-80" />
                    {demo.title}
                  </CardTitle>
                  <Button
                    className="shrink-0 gap-2"
                    render={
                      <Link to={demo.href}>
                        Open full workspace
                        <ExternalLink aria-hidden className="size-4" />
                      </Link>
                    }
                    variant="outline"
                  />
                </div>
                <CardDescription className="mt-2 text-base leading-relaxed">
                  {demo.description}
                </CardDescription>
              </CardHeader>

              <CardPanel className="px-4 pt-0 sm:px-6">
                <div className="landing-demo-frame h-[min(60vh,520px)]">
                  <demo.Demo embedded />
                </div>
              </CardPanel>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
