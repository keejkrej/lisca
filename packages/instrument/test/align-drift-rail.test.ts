import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { AlignDrift } from "@lisca/contracts";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AlignDriftRail, type AlignDriftRailOptions } from "../src/align/align-drift-rail";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

afterEach(cleanupMounted);

const times = [0, 10, 20];

function drift(partial: Partial<AlignDrift> & Pick<AlignDrift, "keyframes">): AlignDrift {
  return {
    referenceTime: 0,
    interpolation: "linear",
    ...partial,
  };
}

function getButtonByName(root: ParentNode, name: string): HTMLButtonElement {
  const button = [...root.querySelectorAll("button")].find(
    (el) => (el.getAttribute("aria-label") ?? el.textContent?.trim()) === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

function getSpinbuttonByName(root: ParentNode, name: string): HTMLInputElement {
  const input = root.querySelector<HTMLInputElement>(`input[type="number"][aria-label="${name}"]`);
  if (!input) throw new Error(`Spinbutton not found: ${name}`);
  return input;
}

function getGroupByName(root: ParentNode, name: string): HTMLElement {
  const group = root.querySelector<HTMLElement>(`[role="group"][aria-label="${name}"]`);
  if (!group) throw new Error(`Group not found: ${name}`);
  return group;
}

async function renderRail(
  overrides: Partial<
    Pick<
      AlignDriftRailOptions<unknown>,
      "assayDefaultTime" | "drift" | "time" | "times" | "frame" | "disabled"
    >
  > = {},
) {
  const onDeltaChange = vi.fn();
  const onSetKeyframe = vi.fn();
  const onClearKeyframe = vi.fn();
  const onClearDrift = vi.fn();
  const onSetReference = vi.fn();

  const Msg = UiSchema.TaggedEnum({
    DeltaChanged: { dx: Schema.Number, dy: Schema.Number },
    SetKeyframe: {},
    ClearKeyframe: {},
    ClearDrift: {},
    SetReference: {},
  });

  const Host = Html.component({
    name: "AlignDriftRailTestHost",
    model: Schema.Struct({}),
    message: Msg,
  }).make({
    init: () => ({}),
    update: {
      DeltaChanged: ($, { dx, dy }) => {
        onDeltaChange(dx, dy);
        return $.model;
      },
      SetKeyframe: ($) => {
        onSetKeyframe();
        return $.model;
      },
      ClearKeyframe: ($) => {
        onClearKeyframe();
        return $.model;
      },
      ClearDrift: ($) => {
        onClearDrift();
        return $.model;
      },
      SetReference: ($) => {
        onSetReference();
        return $.model;
      },
    },
    view: (h) =>
      AlignDriftRail(h, {
        assayDefaultTime: overrides.assayDefaultTime ?? null,
        drift: overrides.drift ?? null,
        time: overrides.time ?? 20,
        times: overrides.times ?? times,
        ...(overrides.frame !== undefined ? { frame: overrides.frame } : {}),
        ...(overrides.disabled !== undefined ? { disabled: overrides.disabled } : {}),
        onClearDrift: Msg.ClearDrift(),
        onClearKeyframe: Msg.ClearKeyframe(),
        onDeltaChange: (dx, dy) => Msg.DeltaChanged({ dx, dy }),
        onSetKeyframe: Msg.SetKeyframe(),
        onSetReference: Msg.SetReference(),
      }),
  });

  const mounted = await mountTest(Host, {});
  return {
    ...mounted,
    onDeltaChange,
    onSetKeyframe,
    onClearKeyframe,
    onClearDrift,
    onSetReference,
  };
}

describe("AlignDriftRail", () => {
  it("shows only the actions when there is no drift", async () => {
    const actions = await renderRail();
    const { container } = actions;

    expect(container.textContent).not.toContain("No drift");
    expect(container.textContent).not.toContain("Reference not set");
    expect(getSpinbuttonByName(container, "dx").value).toBe("0");
    expect(getSpinbuttonByName(container, "dy").value).toBe("0");
    expect(container.textContent).not.toContain("20 (3/3)");
    expect(container.textContent).not.toContain("Keyframe");
    expect(container.textContent).not.toContain("Interpolated");
    expect(container.textContent).not.toContain(
      "The saved correction is applied when the position is cropped.",
    );

    const buttonNames = (groupName: string) =>
      [...getGroupByName(container, groupName).querySelectorAll("button")].map((button) =>
        button.textContent?.trim(),
      );
    expect(buttonNames("Drift record")).toEqual(["Set reference", "Clear drift"]);
    expect(buttonNames("This time")).toEqual(["Set keyframe", "Clear keyframe"]);
    expect(getButtonByName(container, "Set keyframe").hasAttribute("disabled")).toBe(true);
    expect(getButtonByName(container, "Clear keyframe").hasAttribute("disabled")).toBe(true);
    expect(getButtonByName(container, "Clear drift").hasAttribute("disabled")).toBe(true);
    expect(getButtonByName(container, "Set reference").hasAttribute("disabled")).toBe(false);
    expect(actions.onSetKeyframe).not.toHaveBeenCalled();
    expect(actions.onSetReference).not.toHaveBeenCalled();
  });

  it("enables set keyframe once an assay default or stored reference exists", async () => {
    const first = await renderRail({ assayDefaultTime: 0 });
    expect(getButtonByName(first.container, "Set keyframe").hasAttribute("disabled")).toBe(false);

    await cleanupMounted();
    const second = await renderRail({
      drift: drift({ referenceTime: 10, keyframes: [] }),
    });
    expect(second.container.textContent).not.toContain("Reference 10 (2/3)");
    expect(getSpinbuttonByName(second.container, "dx").value).toBe("0");
    expect(getButtonByName(second.container, "Set keyframe").hasAttribute("disabled")).toBe(false);
    expect(second.container.textContent).not.toContain("20 (3/3)");
  });

  it("reads out an explicit pin and an interpolated time", async () => {
    const pinned = await renderRail({
      drift: drift({
        keyframes: [{ time: 20, dx: 1.26, dy: -0.04 }],
      }),
      frame: { width: 8, height: 8 },
    });
    expect(getSpinbuttonByName(pinned.container, "dx").value).toBe("1.26");
    expect(getSpinbuttonByName(pinned.container, "dy").value).toBe("-0.04");
    expect(pinned.container.textContent).not.toContain("Keyframe");
    expect(pinned.container.textContent).not.toContain("20 (3/3)");

    const dxInput = getSpinbuttonByName(pinned.container, "dx");
    dxInput.value = "2";
    dxInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flushMicrotasks();
    dxInput.dispatchEvent(new FocusEvent("blur"));
    await flushMicrotasks();
    expect(pinned.onDeltaChange).toHaveBeenCalledWith(2, -0.04);

    const clearKeyframeButton = getButtonByName(pinned.container, "Clear keyframe");
    expect(clearKeyframeButton.hasAttribute("disabled")).toBe(false);
    clickElement(clearKeyframeButton);
    await flushMicrotasks();
    expect(pinned.onClearKeyframe).toHaveBeenCalledOnce();

    await cleanupMounted();
    const interpolated = await renderRail({
      assayDefaultTime: 0,
      drift: drift({
        keyframes: [{ time: 0, dx: 9, dy: -2 }],
      }),
      frame: { width: 8, height: 8 },
    });
    expect(getSpinbuttonByName(interpolated.container, "dx").value).toBe("9");
    expect(getSpinbuttonByName(interpolated.container, "dy").value).toBe("-2");
    expect(interpolated.container.textContent).not.toContain("Interpolated");
    expect(interpolated.container.textContent).not.toContain(
      "Set keyframe to move this acquisition time.",
    );
    expect(interpolated.container.textContent).toContain("A correction is larger than the frame.");
    clickElement(getButtonByName(interpolated.container, "Set keyframe"));
    await flushMicrotasks();
    expect(interpolated.onSetKeyframe).toHaveBeenCalledOnce();
  });

  it("warns when a pin time is missing and keeps clear drift available", async () => {
    const actions = await renderRail({
      drift: drift({
        referenceTime: 20,
        keyframes: [{ time: 15, dx: 0, dy: 0 }],
      }),
      frame: { width: 8, height: 8 },
    });
    const { container } = actions;

    expect(container.textContent).not.toContain("No drift");
    expect(getSpinbuttonByName(container, "dx").value).toBe("0");
    expect(container.textContent).not.toContain("Interpolated");
    expect(container.textContent).not.toContain("Keyframe");
    expect(container.textContent).toContain("A keyframe time is not in this scan.");
    expect(getButtonByName(container, "Set reference").hasAttribute("disabled")).toBe(true);
    expect(getButtonByName(container, "Clear drift").hasAttribute("disabled")).toBe(false);

    clickElement(getButtonByName(container, "Clear drift"));
    clickElement(getButtonByName(container, "Set reference"));
    await flushMicrotasks();

    expect(actions.onClearDrift).toHaveBeenCalledOnce();
    expect(actions.onSetReference).not.toHaveBeenCalled();
  });
});
