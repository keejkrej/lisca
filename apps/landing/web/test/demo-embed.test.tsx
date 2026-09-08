import { cleanup, render, screen } from "@solidjs/testing-library";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@lisca/aligner-demo", () => ({ AlignDemo: () => null }));
vi.mock("@lisca/annotator-demo", () => ({ AnnotatorDemo: () => null }));
vi.mock("@lisca/studio-demo", () => ({ AnalysisDemo: () => null }));

import { DemoEmbed } from "../src/components/demo-embed";
import { landingDemos, type LandingDemo } from "../src/lib/demos";

afterEach(cleanup);

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

const demoPaths = landingDemos.map((demo) => demo.href);

function renderInRouter(ui: () => JSX.Element) {
  const rootRoute = createRootRoute();
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/card",
    component: ui,
  });
  const placeholderRoutes = demoPaths.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, ...placeholderRoutes]),
    history: createMemoryHistory({ initialEntries: ["/card"] }),
  });

  return render(() => <RouterProvider router={router} />);
}

/**
 * Replace the real demo app with a no-op so the test exercises only the card chrome
 * (CTA link + copy), not the heavy embedded demo mount. The real `linkLabel`, `href`,
 * `title`, and `description` from `landingDemos` are preserved.
 */
function lightDemo(demo: LandingDemo): LandingDemo {
  return { ...demo, Demo: () => null };
}

async function ctaLink(): Promise<HTMLAnchorElement> {
  return (await screen.findByRole("link")) as HTMLAnchorElement;
}

function normalize(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

describe("DemoEmbed CTA", () => {
  it.each([...landingDemos])("renders the card's own linkLabel as the CTA ($id)", async (demo) => {
    renderInRouter(() => <DemoEmbed demo={lightDemo(demo)} index={0} />);

    const link = await ctaLink();
    expect(normalize(link.textContent)).toBe(demo.linkLabel);
    expect(link.getAttribute("href")).toBe(demo.href);
  });

  // CTA↔capability parity guard. AnalysisDemo passes allowOpenFile={false}
  // unconditionally (apps/studio/demo/src/analysis-demo.tsx:48); AlignDemo and
  // AnnotatorDemo pass allowOpenFile={!props.embedded} on the standalone route.
  it("keeps every card's CTA consistent with its destination's open-file capability", () => {
    const fixtureOnlyIds = new Set(["studio"]);
    for (const demo of landingDemos) {
      const cta = demo.linkLabel;
      if (fixtureOnlyIds.has(demo.id)) {
        expect(cta, `${demo.id} is fixture-only; its CTA must not promise file open`).not.toMatch(
          /your own file|upload/i,
        );
      } else {
        expect(cta, `${demo.id} supports opening files; its CTA should invite that`).toBe(
          "Use your own file",
        );
      }
    }
  });
});
