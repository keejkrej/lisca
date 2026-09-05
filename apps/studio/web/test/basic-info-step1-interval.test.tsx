import { RegistryProvider } from "@effect/atom-solid";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { HostFilePickerOperations } from "@lisca/ui/features";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@lisca/ui/features", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lisca/ui/features")>();
  return {
    ...actual,
    HostFilePickerDialog: () => null,
    SourcePickerModal: () => null,
    FolderSourceParseModal: () => null,
  };
});

import { ChooseAssay } from "../src/components/choose-assay";
import { BasicInfoStep1 } from "../src/components/basic-info-step1";
import { createInitialStudioWizardState, studioWizardAtom } from "../src/state/studio-store";

const stubHostPort = {} as HostFilePickerOperations;

function renderWizard() {
  return render(() => (
    <RegistryProvider
      initialValues={[[studioWizardAtom, createInitialStudioWizardState()] as const]}
    >
      <ChooseAssay />
      <BasicInfoStep1 hostPort={stubHostPort} />
    </RegistryProvider>
  ));
}

function intervalInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[name="timelapse-interval"]');
  if (!input) throw new Error("interval input not rendered");
  return input;
}

afterEach(cleanup);

describe("BasicInfoStep1 interval field across assay switches", () => {
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
