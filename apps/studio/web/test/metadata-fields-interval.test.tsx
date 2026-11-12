import { RegistryProvider } from "@effect/atom-solid";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { HostFilePickerOperations } from "@lisca/instrument";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("@lisca/instrument", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lisca/instrument")>();
  return {
    ...actual,
    HostFilePickerDialog: () => null,
    FolderSourceParseModal: () => null,
  };
});

import { ChooseAssay } from "../src/components/choose-assay";
import { MetadataFields } from "../src/components/metadata-fields";
import { createInitialStudioWizardState, studioWizardAtom } from "../src/state/studio-store";

const stubHostPort = {} as HostFilePickerOperations;

function renderWizard() {
  return render(() => (
    <RegistryProvider
      initialValues={[[studioWizardAtom, createInitialStudioWizardState()] as const]}
    >
      <ChooseAssay />
      <MetadataFields hostPort={stubHostPort} />
    </RegistryProvider>
  ));
}

function intervalInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[name="timelapse-interval"]');
  if (!input) throw new Error("interval input not rendered");
  return input;
}

afterEach(cleanup);

describe("MetadataFields misc", () => {
  it("labels the workspace picker as Output folder", () => {
    renderWizard();
    expect(screen.getByText("Output folder")).toBeTruthy();
    expect(screen.getByText(/workspace for this run/)).toBeTruthy();
  });

  it("shows skip segmentation for transfection and killing without a smart segmentation radio group", async () => {
    renderWizard();
    expect(screen.getByText("Misc")).toBeTruthy();
    expect(screen.getByText("Max onset time t0")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Skip segmentation" })).toBeTruthy();
    expect(screen.queryByText("Segmentation method")).toBeNull();
    expect(screen.queryByRole("radio", { name: /Smart segmentation/ })).toBeNull();
    expect(screen.queryByText("Use the full ROI (skip mask)")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Killing \(death reporter\)/ }));

    await waitFor(() => {
      expect(screen.getByText("Misc")).toBeTruthy();
      expect(screen.getByRole("checkbox", { name: "Skip segmentation" })).toBeTruthy();
      expect(screen.queryByText("Max onset time t0")).toBeNull();
    });
  });
});

describe("MetadataFields interval field across assay switches", () => {
  it("seeds the transfection default 10", () => {
    const { container } = renderWizard();
    const input = intervalInput(container);
    expect(input.value).toBe("10");
    expect(input.placeholder).toBe("");
  });

  it("replaces the transfection default with 5 minutes when selecting killing", async () => {
    const { container } = renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Killing \(death reporter\)/ }));

    await waitFor(() => {
      const input = intervalInput(container);
      expect(input.value).toBe("5");
      expect(input.placeholder).toBe("");
      const killing = screen.getByRole("button", { name: /Killing \(death reporter\)/ });
      expect(killing.textContent).toContain("Cytotoxicity timeseries");
      expect(killing.textContent).toContain("Fluorescence");
      const labelFree = screen.getByRole("button", { name: /Killing \(label-free\)/ });
      expect(labelFree.hasAttribute("disabled")).toBe(true);
      expect(labelFree.textContent).toContain("Cytotoxicity timeseries");
      expect(labelFree.textContent).toContain("Brightfield");
      const engagement = screen.getByRole("button", { name: /Killing \(engagement\)/ });
      expect(engagement.hasAttribute("disabled")).toBe(false);
      expect(engagement.textContent).toContain("Engager counts");
      expect(engagement.textContent).toContain("Fluorescence");
    });
  });
});
