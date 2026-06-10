import { Button } from "@lisca/ui/components";
import { ShellThemeToggle } from "@lisca/ui/shell";
import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";

import { GITHUB_URL } from "../lib/constants";

export function SiteNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link className="flex min-w-0 items-center gap-2.5" to="/">
          <img alt="" className="size-8 rounded-lg" height={32} src="/icon.png" width={32} />
          <span className="truncate font-semibold tracking-tight">LiSCA</span>
        </Link>

        <div className="flex items-center gap-1">
          <ShellThemeToggle />
          <Button
            render={
              <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
                <Github aria-hidden />
                GitHub
              </a>
            }
            size="sm"
            variant="outline"
          />
        </div>
      </div>
    </header>
  );
}
