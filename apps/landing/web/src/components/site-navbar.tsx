import { Button } from "@lisca/ui/components";
import { ShellThemeToggle } from "@lisca/ui/shell";
import { Github } from "lucide-react";

import { GITHUB_URL } from "../lib/constants";

const navLinks = [
  { href: "#demos", label: "Demos" },
  { href: "#platform", label: "Platform" },
] as const;

export function SiteNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a className="flex min-w-0 items-center gap-2.5" href="/">
          <img alt="" className="size-8 rounded-lg" height={32} src="/icon.png" width={32} />
          <span className="truncate font-semibold tracking-tight">Lisca</span>
        </a>

        <nav className="hidden items-center gap-1 sm:flex">
          {navLinks.map((link) => (
            <Button key={link.href} render={<a href={link.href} />} size="sm" variant="ghost">
              {link.label}
            </Button>
          ))}
        </nav>

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
