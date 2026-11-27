import { Html } from "@effect/ui/html";
import {
  sequentialCatalog,
  sparseFolderCatalog,
  type PositionCatalog,
} from "@lisca/client/studio/position-index";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { MetadataSamples } from "../src/components/metadata-samples";
import { resetStudioRegistry, studioRegistry } from "../src/state/studio-registry";
import { createInitialStudioWizardState, studioWizardAtom } from "../src/state/studio-store";
import {
  cleanupMounted,
  clickElement,
  keyDownElement,
  mountTest,
  setInputValue,
  waitForCondition,
} from "./render-helper";

const ND2_CATALOG = sequentialCatalog("nd2", 80);

const PositionCatalogSchema = Schema.Struct({
  kind: Schema.Literals(["folder", "nd2", "czi"]),
  ids: Schema.Array(Schema.Number),
  labels: Schema.Array(Schema.String),
});

const SamplesHost = Html.component({
  name: "MetadataSamplesTestHost",
  props: Schema.Struct({
    catalog: PositionCatalogSchema,
  }),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: {},
  view: (h) => MetadataSamples(h, { catalog: h.props.catalog as PositionCatalog }),
});

beforeEach(() => {
  resetStudioRegistry();
});

afterEach(async () => {
  await cleanupMounted();
  resetStudioRegistry();
});

async function mountSamples(
  positions: string,
  catalog = ND2_CATALOG,
  positionIndexVersion: number | null = 1,
) {
  const initial = createInitialStudioWizardState();
  const state = {
    ...initial,
    positionIndexVersion,
    samples: initial.samples.map((row, index) => (index === 0 ? { ...row, positions } : row)),
  };
  studioRegistry.set(studioWizardAtom, state);

  const mounted = await mountTest(SamplesHost, {
    catalog: { kind: catalog.kind, ids: [...catalog.ids], labels: [...catalog.labels] },
  });

  const positionsInputs = Array.from(
    mounted.container.querySelectorAll<HTMLInputElement>('input[aria-label="Positions"]'),
  );
  return {
    container: mounted.container,
    stored: () => studioRegistry.get(studioWizardAtom).samples[0]!,
    channels: () => {
      const wizard = studioRegistry.get(studioWizardAtom);
      return {
        segmentation: wizard.segmentationChannel,
        signal: wizard.signalChannel,
      };
    },
    positions: positionsInputs[0]!,
  };
}

function typePositions(input: HTMLInputElement, value: string) {
  setInputValue(input, value);
  input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
}

function findButtonByAriaLabel(root: ParentNode, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll("button")).find(
    (button) => button.getAttribute("aria-label") === label,
  );
}

function findTooltip(): HTMLElement | null {
  const tooltips = Array.from(document.querySelectorAll<HTMLElement>('[role="tooltip"]'));
  return tooltips.find((el) => el.hasAttribute("data-open")) ?? null;
}

describe("MetadataSamples positions", () => {
  it("shows stored ranges as 1-based chips and keeps a gap", async () => {
    const { container } = await mountSamples("0:4,20:24");
    expect(findButtonByAriaLabel(container, "Remove 1–5")).toBeTruthy();
    expect(findButtonByAriaLabel(container, "Remove 21–25")).toBeTruthy();
    expect(container.querySelector('[data-testid="resolved-positions"]')?.textContent).toBe(
      "10 positions: 1 to 25",
    );
    expect(container.querySelector('input[aria-label="Position start"]')).toBeNull();
    expect(container.querySelector('input[aria-label="Position finish"]')).toBeNull();
  });

  it("stores typed ranges as 0-based chips, including a gap", async () => {
    const { container, positions, stored } = await mountSamples("");
    typePositions(positions, "1-5, 21-25");
    await waitForCondition(() => stored().positions === "0:4,20:24");
    expect(positions.value).toBe("");
    expect(findButtonByAriaLabel(container, "Remove 1–5")).toBeTruthy();
    expect(findButtonByAriaLabel(container, "Remove 21–25")).toBeTruthy();
  });

  it("merges an overlap and keeps text that is not a position", async () => {
    const { positions, stored } = await mountSamples("");
    typePositions(positions, "1-5, 4-8");
    await waitForCondition(() => stored().positions === "0:7");
    typePositions(positions, "foo");
    await waitForCondition(() => positions.getAttribute("aria-invalid") === "true");
    expect(positions.value).toBe("foo");
    expect(stored().positions).toBe("0:7");
  });

  it("migrates a legacy folder range to the same physical positions", async () => {
    const { container, stored } = await mountSamples(
      "138,144,161",
      sparseFolderCatalog([138, 144, 161]),
      null,
    );
    await waitForCondition(() => stored().positions === "0:2");
    expect(container.querySelector('[data-testid="resolved-positions"]')?.textContent).toBe(
      "3 positions: Pos138 to Pos161",
    );
    expect(findButtonByAriaLabel(container, "Remove 138–161")).toBeTruthy();
  });

  it("refuses a legacy folder number that is not in the source", async () => {
    const { container } = await mountSamples("137", sparseFolderCatalog([138, 144, 161]), null);
    const alert = await waitForCondition(() => container.querySelector('[role="alert"]'));
    expect(alert.textContent).toMatch(/Position 137 is not in this source/);
  });

  it("removes the last chip with Backspace and one chip from its button", async () => {
    const { container, positions, stored } = await mountSamples("0:4,20:24");
    keyDownElement(positions, "Backspace");
    await waitForCondition(() => stored().positions === "0:4");
    const removeButton = await waitForCondition(() =>
      findButtonByAriaLabel(container, "Remove 1–5"),
    );
    clickElement(removeButton);
    await waitForCondition(() => stored().positions === "");
  });
});

describe("MetadataSamples columns", () => {
  it("identifies samples by name with no Slide column", async () => {
    const { container } = await mountSamples("");
    expect(container.querySelector('input[aria-label="Slide channel"]')).toBeNull();
    expect(container.textContent).not.toContain("Slide");
    expect(container.querySelectorAll('input[aria-label="Name"]')).toHaveLength(2);
  });

  it("edits the assay channels and keeps card fields as overrides", async () => {
    const { container, stored, channels } = await mountSamples("");
    const segmentation = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[aria-label="Segmentation channel"]'),
    );
    const signal = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[aria-label="Signal channel"]'),
    );
    expect(segmentation).toHaveLength(3);
    expect(signal).toHaveLength(3);
    const segLabels = Array.from(container.querySelectorAll("label")).filter(
      (label) => label.textContent?.trim() === "Segmentation channel",
    );
    const sigLabels = Array.from(container.querySelectorAll("label")).filter(
      (label) => label.textContent?.trim() === "Signal channel",
    );
    expect(segLabels).toHaveLength(3);
    expect(sigLabels).toHaveLength(3);
    expect(findTooltip()).toBeNull();
    expect(findButtonByAriaLabel(container, "Name details")).toBeUndefined();

    const positionDetails = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[aria-label="Positions details"]'),
    );
    expect(positionDetails).toHaveLength(2);
    expect(findButtonByAriaLabel(container, "Position start details")).toBeUndefined();

    const segmentationDetails = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        'button[aria-label="Segmentation channel details"]',
      ),
    );
    expect(segmentationDetails).toHaveLength(3);
    expect(container.querySelectorAll('button[aria-label="Signal channel details"]')).toHaveLength(
      3,
    );

    positionDetails[0]!.focus();
    positionDetails[0]!.dispatchEvent(new FocusEvent("focus", { bubbles: false }));
    const posTooltip = await waitForCondition(() => {
      const tip = findTooltip();
      return tip && tip.textContent?.includes("Type the source labels") ? tip : null;
    });
    expect(posTooltip.textContent).toBe(
      "Type the source labels, for example 1-67 or 138, 144. Counting matches the folder names or NIS/ZEN position names.",
    );

    segmentationDetails[0]!.focus();
    segmentationDetails[0]!.dispatchEvent(new FocusEvent("focus", { bubbles: false }));
    const assaySegTooltip = await waitForCondition(() => {
      const tip = findTooltip();
      return tip && tip.textContent?.includes("Channel used to find cells") ? tip : null;
    });
    expect(assaySegTooltip.textContent).toBe(
      "Channel used to find cells. Used for every sample unless a card overrides it.",
    );

    segmentationDetails[1]!.focus();
    segmentationDetails[1]!.dispatchEvent(new FocusEvent("focus", { bubbles: false }));
    const overrideSegTooltip = await waitForCondition(() => {
      const tip = findTooltip();
      return tip && tip.textContent?.includes("Override for this sample only") ? tip : null;
    });
    expect(overrideSegTooltip.textContent).toBe(
      "Override for this sample only. Leave empty to use the assay segmentation channel.",
    );

    setInputValue(segmentation[0]!, "0");
    setInputValue(signal[0]!, "1,2");
    setInputValue(segmentation[1]!, "2");
    await waitForCondition(
      () =>
        channels().segmentation === "0" &&
        channels().signal === "1,2" &&
        stored().segmentation === "2",
    );
    expect(stored().signal).toBe("");
  });
});
