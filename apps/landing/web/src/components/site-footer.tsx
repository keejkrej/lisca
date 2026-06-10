import { Button } from "@lisca/ui/components";
import { Github } from "lucide-react";

import { GITHUB_REPO, GITHUB_URL } from "../lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-3">
          <img alt="" className="size-7 rounded-md" height={28} src="/icon.png" width={28} />
          <div>
            <p className="font-medium">LiSCA</p>
            <p className="text-muted-foreground text-sm">
              Live-cell imaging on single-cell arrays
            </p>
          </div>
        </div>

        <Button
          render={
            <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
              <Github aria-hidden />
              github.com/{GITHUB_REPO}
            </a>
          }
          variant="outline"
        />
      </div>
    </footer>
  );
}
