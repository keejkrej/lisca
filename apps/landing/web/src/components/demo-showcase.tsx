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
            Try it in your browser
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Both demos run entirely in the browser — open a local PNG, JPEG, or TIFF and interact
            immediately. No account, no server, no install.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-12">
          {landingDemos.map((demo) => (
            <Card className="overflow-hidden" key={demo.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <demo.icon aria-hidden className="size-5 opacity-80" />
                  {demo.title}
                </CardTitle>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <CardDescription className="text-base leading-relaxed">
                    {demo.description}
                  </CardDescription>
                  <Button
                    className="shrink-0 gap-2"
                    render={
                      <Link to={demo.href}>
                        Open full demo
                        <ExternalLink aria-hidden className="size-4" />
                      </Link>
                    }
                    variant="outline"
                  />
                </div>
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
