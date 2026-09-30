import { RegistryProvider } from "@effect/atom-solid";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { HostFilePickerOperations } from "@lisca/ui/features";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("@lisca/ui/features", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lisca/ui/features")>();
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
  it("shows skip segmentation under Misc for transfection only", async () => {
    renderWizard();
    expect(screen.getByText("Misc")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Skip segmentation" })).toBeTruthy();
    expect(screen.queryByText("Use the full site (skip mask)")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Killing/ }));

    await waitFor(() => {
      expect(screen.queryByText("Misc")).toBeNull();
      expect(screen.queryByRole("checkbox", { name: "Skip segmentation" })).toBeNull();
    });
  });
});

describe("MetadataFields interval field across assay switches", () => {
  it("seeds the transfection default 10 and the e.g. 10 placeholder", () => {
    const { container } = renderWizard();
    const input = intervalInput(container);
    expect(input.value).toBe("10");
    expect(input.placeholder).toBe("e.g. 10…");
  });

  it("clears the interval and switches the placeholder to Enter interval when selecting killing", async () => {
    const { container } = renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Killing/ }));

    await waitFor(() => {
      const input = intervalInput(container);
      expect(input.value).toBe("");
      expect(input.placeholder).toBe("Enter interval…");
    });
  });
});
