import { RegistryProvider, useAtomValue } from "@effect/atom-solid";
import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { MetadataSamples } from "../src/components/metadata-samples";
import { createInitialStudioWizardState, studioWizardAtom } from "../src/state/studio-store";

afterEach(cleanup);

function renderSamples(positionStart: string, positionFinish: string) {
  const initial = createInitialStudioWizardState();
  const state = {
    ...initial,
    samples: initial.samples.map((row, index) =>
      index === 0 ? { ...row, positionStart, positionFinish } : row,
    ),
  };
  let stored = () => state.samples[0]!;
  render(() => (
    <RegistryProvider initialValues={[[studioWizardAtom, state] as const]}>
      {(() => {
        const wizard = useAtomValue(() => studioWizardAtom);
        stored = () => wizard().samples[0]!;
        return <MetadataSamples />;
      })()}
    </RegistryProvider>
  ));
  return {
    stored: () => stored(),
    start: screen.getAllByRole("textbox", { name: "Position start" })[0] as HTMLInputElement,
    finish: screen.getAllByRole("textbox", { name: "Position finish" })[0] as HTMLInputElement,
  };
}

describe("MetadataSamples positions", () => {
  it("shows stored 0-based positions as 1-based", () => {
    const { start, finish } = renderSamples("0", "66");
    expect(start.value).toBe("1");
    expect(finish.value).toBe("67");
  });

  it("stores typed 1-based positions as 0-based", () => {
    const { start, finish, stored } = renderSamples("", "");
    fireEvent.change(start, { target: { value: "1" } });
    fireEvent.change(finish, { target: { value: "67" } });
    expect(stored().positionStart).toBe("0");
    expect(stored().positionFinish).toBe("66");
    expect(start.value).toBe("1");
    expect(finish.value).toBe("67");
  });

  it("keeps out-of-range text visible but stores nothing", () => {
    const { start, stored } = renderSamples("4", "9");
    fireEvent.change(start, { target: { value: "0" } });
    expect(start.value).toBe("0");
    expect(stored().positionStart).toBe("");
  });
});

describe("MetadataSamples columns", () => {
  it("identifies samples by name with no Slide column", () => {
    renderSamples("", "");
    expect(screen.queryByRole("textbox", { name: "Slide channel" })).toBeNull();
    expect(screen.queryByText("Slide")).toBeNull();
    expect(screen.getAllByRole("textbox", { name: "Name" })).toHaveLength(2);
  });

  it("edits the segmentation channel", () => {
    const { stored } = renderSamples("", "");
    const segmentation = screen.getAllByRole("textbox", {
      name: "Segmentation channel",
    })[0] as HTMLInputElement;
    expect(screen.getAllByText("Segmentation").length).toBeGreaterThan(0);
    fireEvent.change(segmentation, { target: { value: "2" } });
    expect(stored().segmentation).toBe("2");
  });
});
