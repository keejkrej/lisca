import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@effect-atom/atom-solid", () => ({
  useAtomSet: () => vi.fn(),
  useAtomValue: () => () => true,
}));

vi.mock("../src/atoms/studio-expert-atoms", () => ({
  setStudioExpertMode: vi.fn(),
  studioExpertModeAtom: {},
}));

import { StudioRightPanel } from "../src/components/studio-right-panel";

afterEach(cleanup);

describe("StudioRightPanel", () => {
  it("safely centers short rails without making overflowing expert content unreachable", () => {
    const view = render(() => (
      <StudioRightPanel expert={() => <div>Expert controls</div>} instruction="Instruction" />
    ));

    const scroll = view.container.querySelector('[data-slot="rail-sidebar-scroll"]');
    const stack = view.container.querySelector('[data-slot="rail-section-stack"]');
    const rail = view.container.firstElementChild;

    expect(scroll).not.toBeNull();
    expect(rail?.classList.contains("px-7")).toBe(false);
    expect(scroll?.classList.contains("overflow-y-auto")).toBe(true);
    expect((scroll as HTMLElement | null)?.style.scrollbarGutter).toBe("stable both-edges");
    expect(scroll?.classList.contains("w-[200px]")).toBe(false);
    expect(scroll?.classList.contains("justify-center")).toBe(false);
    expect(stack?.classList.contains("my-auto")).toBe(true);
    expect(stack?.classList.contains("w-[200px]")).toBe(true);
    expect(stack?.classList.contains("gap-4")).toBe(true);
    expect(screen.getAllByText("Instruction")).toHaveLength(2);
    expect(screen.getByText("Expert controls")).toBeTruthy();
  });

  it("shows default content when expert mode is persisted but no expert view exists", () => {
    render(() => (
      <StudioRightPanel>
        <p>Default controls</p>
      </StudioRightPanel>
    ));

    expect(screen.getByText("Default controls")).toBeTruthy();
    expect(screen.queryByRole("switch", { name: "Expert mode" })).toBeNull();
  });

  it("keeps expert mode controls out of the scrolling rail", () => {
    render(() => <StudioRightPanel expert={() => <div>Expert controls</div>} />);

    expect(screen.queryByRole("switch", { name: "Expert mode" })).toBeNull();
  });
});
