import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const webAppRoot = resolve(repoRoot, "packages/web-app");

type TailwindSource = { base: string; pattern: string; negated: boolean };

type CompiledStylesheet = {
  sources: TailwindSource[];
  root: "none" | { base: string; pattern: string } | null;
  build(candidates: string[]): string;
};

/**
 * Utilities that only exist on instrument surfaces. They broke when feature UI
 * moved out of `@lisca/ui` and stopped being a Tailwind `@source`.
 */
const instrumentUtilities = [
  "grid-cols-[2rem_minmax(0,1fr)_2rem]",
  "grid-cols-[minmax(0,1fr)_2rem]",
  "size-8",
  "data-[orientation=horizontal]:!min-w-0",
  "max-w-[32.5rem]",
] as const;

function tailwindFromVitePlugin(): {
  compile: (
    css: string,
    options: { base: string; onDependency: () => void },
  ) => Promise<CompiledStylesheet>;
  Scanner: new (options: { sources: TailwindSource[] }) => { scan(): string[] };
} {
  const vitePackage = realpathSync(
    resolve(webAppRoot, "node_modules/@tailwindcss/vite/package.json"),
  );
  const require = createRequire(vitePackage);
  return {
    compile: require("@tailwindcss/node").compile,
    Scanner: require("@tailwindcss/oxide").Scanner,
  };
}

describe("app.css Tailwind sources", () => {
  it("scans instrument rail classes that @lisca/ui does not own", async () => {
    const { compile, Scanner } = tailwindFromVitePlugin();
    const css = readFileSync(resolve(webAppRoot, "app.css"), "utf8");
    const compiler = await compile(css, {
      base: webAppRoot,
      onDependency() {},
    });
    const sources = compiler.sources.filter((source) => !source.negated);
    if (compiler.root && compiler.root !== "none") {
      sources.push({ ...compiler.root, negated: false });
    }

    const candidates = new Scanner({ sources }).scan();
    for (const utility of instrumentUtilities) {
      expect(candidates, utility).toContain(utility);
    }

    const built = compiler.build([...instrumentUtilities]);
    expect(built).toContain("grid-template-columns: 2rem minmax(0,1fr) 2rem");
    expect(built).toContain("grid-template-columns: minmax(0,1fr) 2rem");
    expect(built).toContain("min-width: 0px !important");
    expect(built).toContain("max-width: 32.5rem");
  });
});
