import { RegistryProvider, useAtomValue } from "@effect/atom-solid";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { MetadataSamples } from "../src/components/metadata-samples";
import { createInitialStudioWizardState, studioWizardAtom } from "../src/state/studio-store";

afterEach(cleanup);

function renderSamples(positions: string) {
  const initial = createInitialStudioWizardState();
  const state = {
    ...initial,
    samples: initial.samples.map((row, index) => (index === 0 ? { ...row, positions } : row)),
  };
  let stored = () => state.samples[0]!;
  let channels = () => ({
    segmentation: state.segmentationChannel,
    signal: state.signalChannel,
  });
  render(() => (
    <RegistryProvider initialValues={[[studioWizardAtom, state] as const]}>
      {(() => {
        const wizard = useAtomValue(() => studioWizardAtom);
        stored = () => wizard().samples[0]!;
        channels = () => ({
          segmentation: wizard().segmentationChannel,
          signal: wizard().signalChannel,
        });
        return <MetadataSamples />;
      })()}
    </RegistryProvider>
  ));
  return {
    stored: () => stored(),
    channels: () => channels(),
    positions: screen.getAllByRole("textbox", { name: "Positions" })[0] as HTMLInputElement,
  };
}

function typePositions(input: HTMLInputElement, value: string) {
  fireEvent.input(input, { target: { value } });
  fireEvent.blur(input);
}

describe("MetadataSamples positions", () => {
  it("shows stored ranges as 1-based chips and keeps a gap", () => {
    renderSamples("0:4,20:24");
    expect(screen.getByRole("button", { name: "Remove 1–5" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove 21–25" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Position start" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Position finish" })).toBeNull();
  });

  it("stores typed ranges as 0-based chips, including a gap", () => {
    const { positions, stored } = renderSamples("");
    typePositions(positions, "1-5, 21-25");
    expect(stored().positions).toBe("0:4,20:24");
    expect(positions.value).toBe("");
    expect(screen.getByRole("button", { name: "Remove 1–5" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove 21–25" })).toBeTruthy();
  });

  it("merges an overlap and keeps text that is not a position", () => {
    const { positions, stored } = renderSamples("");
    typePositions(positions, "1-5, 4-8");
    expect(stored().positions).toBe("0:7");
    typePositions(positions, "foo");
    expect(positions.value).toBe("foo");
    expect(positions.getAttribute("aria-invalid")).toBe("true");
    expect(stored().positions).toBe("0:7");
  });

  it("removes the last chip with Backspace and one chip from its button", () => {
    const { positions, stored } = renderSamples("0:4,20:24");
    fireEvent.keyDown(positions, { key: "Backspace" });
    expect(stored().positions).toBe("0:4");
    fireEvent.click(screen.getByRole("button", { name: "Remove 1–5" }));
    expect(stored().positions).toBe("");
  });
});

describe("MetadataSamples columns", () => {
  it("identifies samples by name with no Slide column", () => {
    renderSamples("");
    expect(screen.queryByRole("textbox", { name: "Slide channel" })).toBeNull();
    expect(screen.queryByText("Slide")).toBeNull();
    expect(screen.getAllByRole("textbox", { name: "Name" })).toHaveLength(2);
  });

  it("edits the assay channels and keeps card fields as overrides", async () => {
    const { stored, channels } = renderSamples("");
    const segmentation = screen.getAllByRole("textbox", {
      name: "Segmentation channel",
    });
    const signal = screen.getAllByRole("textbox", { name: "Signal channel" });
    expect(segmentation).toHaveLength(3);
    expect(signal).toHaveLength(3);
    expect(screen.getAllByText("Segmentation channel")).toHaveLength(3);
    expect(screen.getAllByText("Signal channel")).toHaveLength(3);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(screen.queryByRole("button", { name: "Name details" })).toBeNull();
    const positionDetails = screen.getAllByRole("button", { name: "Positions details" });
    expect(positionDetails).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Position start details" })).toBeNull();
    const segmentationDetails = screen.getAllByRole("button", {
      name: "Segmentation channel details",
    });
    expect(segmentationDetails).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Signal channel details" })).toHaveLength(3);
    (positionDetails[0] as HTMLButtonElement).focus();
    await waitFor(() => {
      expect(screen.getByRole("tooltip").textContent).toBe(
        "Counting starts at 1. Type 1-5, 21-25, 28 and press Enter.",
      );
    });
    (segmentationDetails[0] as HTMLButtonElement).focus();
    await waitFor(() => {
      expect(screen.getByRole("tooltip").textContent).toBe(
        "Channel used to find cells. Used for every sample unless a card overrides it.",
      );
    });
    (segmentationDetails[1] as HTMLButtonElement).focus();
    await waitFor(() => {
      expect(screen.getByRole("tooltip").textContent).toBe(
        "Override for this sample only. Leave empty to use the assay segmentation channel.",
      );
    });

    fireEvent.input(segmentation[0]!, { target: { value: "0" } });
    fireEvent.input(signal[0]!, { target: { value: "1,2" } });
    fireEvent.input(segmentation[1]!, { target: { value: "2" } });
    expect(channels().segmentation).toBe("0");
    expect(channels().signal).toBe("1,2");
    expect(stored().segmentation).toBe("2");
    expect(stored().signal).toBe("");
  });
});
