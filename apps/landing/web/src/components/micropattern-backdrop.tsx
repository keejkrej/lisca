import { cn } from "@lisca/ui/components";

/**
 * Decorative layered backdrop evoking a micropatterned adhesion-site array:
 * blueprint grid + dot grid + a radial "illumination" glow, with a few
 * pulsing occupied sites. Purely presentational; hidden from assistive tech.
 */
export function MicropatternBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "backdrop-micropattern pointer-events-none absolute inset-0 overflow-hidden",
        "[mask-image:radial-gradient(120%_90%_at_50%_0%,black,transparent_78%)]",
        className,
      )}
    >
      {SITES.map((site, index) => (
        <span
          key={`${site.left}-${site.top}`}
          className="animate-site absolute size-1.5 rounded-full"
          style={{
            left: `${site.left}%`,
            top: `${site.top}%`,
            backgroundColor: "var(--accent-glow-strong)",
            boxShadow: "0 0 12px 2px var(--accent-glow)",
            animationDelay: `${index * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

const SITES = [
  { left: 18, top: 32 },
  { left: 73, top: 22 },
  { left: 41, top: 58 },
  { left: 88, top: 46 },
  { left: 9, top: 64 },
  { left: 62, top: 70 },
] as const;
