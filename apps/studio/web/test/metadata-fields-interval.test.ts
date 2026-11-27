import { Html } from "@effect/ui/html";
import { HostFilePickerPort } from "@lisca/instrument";
import { Layer, Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { ChooseAssay } from "../src/components/choose-assay";
import { MetadataFields } from "../src/components/metadata-fields";
import { resetStudioRegistry, studioRegistry } from "../src/state/studio-registry";
import { createInitialStudioWizardState, studioWizardAtom } from "../src/state/studio-store";
import { cleanupMounted, clickElement, mountTest, waitForCondition } from "./render-helper";

const WizardHost = Html.component({
  name: "MetadataFieldsIntervalTestHost",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: {},
  view: (h) =>
    h.div.children(ChooseAssay(h, { key: "choose" }), MetadataFields(h, { key: "fields" })),
});

async function mountWizard() {
  studioRegistry.set(studioWizardAtom, createInitialStudioWizardState());
  return mountTest(WizardHost, {}, { layer: Layer.succeed(HostFilePickerPort, null) });
}

function intervalInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[name="timelapse-interval"]');
  if (!input) throw new Error("interval input not rendered");
  return input;
}

function findButton(container: ParentNode, match: string | RegExp): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((button) => {
    const label = button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "";
    return typeof match === "string" ? label === match : match.test(label);
  });
}

function findCheckboxByLabel(
  container: ParentNode,
  labelText: string,
): HTMLInputElement | undefined {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).find(
    (input) => {
      const label = input.closest("label");
      return label?.textContent?.includes(labelText);
    },
  );
}

beforeEach(() => {
  resetStudioRegistry();
});

afterEach(async () => {
  await cleanupMounted();
  resetStudioRegistry();
});

describe("MetadataFields misc", () => {
  it("labels the workspace picker as Output folder", async () => {
    const { container } = await mountWizard();
    expect(container.textContent).toContain("Output folder");
    expect(container.textContent).toMatch(/workspace for this run/);
  });

  it("shows skip segmentation for transfection and killing without a smart segmentation radio group", async () => {
    const { container } = await mountWizard();
    expect(container.textContent).toContain("Misc");
    expect(container.textContent).toContain("Max onset time t0");
    expect(findCheckboxByLabel(container, "Skip segmentation")).toBeTruthy();
    expect(container.textContent).not.toContain("Segmentation method");
    expect(container.querySelector('input[type="radio"]')).toBeNull();
    expect(container.textContent).not.toContain("Use the full ROI (skip mask)");

    const cellKilling = findButton(container, "Cell killing");
    expect(cellKilling).toBeTruthy();
    clickElement(cellKilling!);

    const deathReporter = await waitForCondition(() =>
      findButton(container, /Killing \(death reporter\)/),
    );
    clickElement(deathReporter);

    await waitForCondition(
      () =>
        container.textContent?.includes("Misc") &&
        Boolean(findCheckboxByLabel(container, "Skip segmentation")) &&
        !container.textContent?.includes("Max onset time t0"),
    );
  });
});

describe("MetadataFields interval field across assay switches", () => {
  it("seeds the transfection default 10", async () => {
    const { container } = await mountWizard();
    const input = intervalInput(container);
    expect(input.value).toBe("10");
    expect(input.placeholder).toBe("");
  });

  it("replaces the transfection default with 5 minutes when selecting killing", async () => {
    const { container } = await mountWizard();
    const cellKilling = findButton(container, "Cell killing");
    expect(cellKilling).toBeTruthy();
    clickElement(cellKilling!);

    const deathReporter = await waitForCondition(() =>
      findButton(container, /Killing \(death reporter\)/),
    );
    clickElement(deathReporter);

    await waitForCondition(() => intervalInput(container).value === "5");
    const input = intervalInput(container);
    expect(input.value).toBe("5");
    expect(input.placeholder).toBe("");

    const killing = findButton(container, /Killing \(death reporter\)/)!;
    expect(killing.textContent).toContain("Cytotoxicity timeseries");
    expect(killing.textContent).toContain("Fluorescence");

    const labelFree = findButton(container, /Killing \(label-free\)/)!;
    expect(
      labelFree.hasAttribute("disabled") || labelFree.getAttribute("aria-disabled") === "true",
    ).toBe(true);
    expect(labelFree.textContent).toContain("Cytotoxicity timeseries");
    expect(labelFree.textContent).toContain("Brightfield");

    const engagement = findButton(container, /Killing \(engagement\)/)!;
    expect(engagement.hasAttribute("disabled")).toBe(false);
    expect(engagement.getAttribute("aria-disabled")).not.toBe("true");
    expect(engagement.textContent).toContain("Engager counts");
    expect(engagement.textContent).toContain("Fluorescence");
  });
});
