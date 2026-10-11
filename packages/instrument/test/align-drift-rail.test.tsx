import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import type { AlignDrift } from "@lisca/contracts";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AlignDriftRail } from "../src/align/align-drift-rail";

afterEach(cleanup);

const times = [0, 10, 20];

function drift(partial: Partial<AlignDrift> & Pick<AlignDrift, "keyframes">): AlignDrift {
  return {
    referenceTime: 0,
    interpolation: "linear",
    ...partial,
  };
}

function renderRail(props: Partial<Parameters<typeof AlignDriftRail>[0]> = {}) {
  const onDeltaChange = vi.fn();
  const onSetKeyframe = vi.fn();
  const onClearKeyframe = vi.fn();
  const onClearDrift = vi.fn();
  const onSetReference = vi.fn();
  render(() => (
    <AlignDriftRail
      assayDefaultTime={null}
      drift={null}
      time={20}
      times={times}
      onClearDrift={onClearDrift}
      onClearKeyframe={onClearKeyframe}
      onDeltaChange={onDeltaChange}
      onSetKeyframe={onSetKeyframe}
      onSetReference={onSetReference}
      {...props}
    />
  ));
  return { onDeltaChange, onSetKeyframe, onClearKeyframe, onClearDrift, onSetReference };
}

describe("AlignDriftRail", () => {
  it("shows only the actions when there is no drift", () => {
    const actions = renderRail();

    expect(screen.queryByText("No drift")).toBeNull();
    expect(screen.queryByText("Reference not set")).toBeNull();
    expect((screen.getByRole("spinbutton", { name: "dx" }) as HTMLInputElement).value).toBe("0");
    expect((screen.getByRole("spinbutton", { name: "dy" }) as HTMLInputElement).value).toBe("0");
    expect(screen.queryByText("20 (3/3)")).toBeNull();
    expect(screen.queryByText("Keyframe")).toBeNull();
    expect(screen.queryByText("Interpolated")).toBeNull();
    expect(
      screen.queryByText("The saved correction is applied when the position is cropped."),
    ).toBeNull();
    const buttonNames = (groupName: string) =>
      [...screen.getByRole("group", { name: groupName }).querySelectorAll("button")].map((button) =>
        button.textContent?.trim(),
      );
    expect(buttonNames("Drift record")).toEqual(["Set reference", "Clear drift"]);
    expect(buttonNames("This time")).toEqual(["Set keyframe", "Clear keyframe"]);
    expect(screen.getByRole("button", { name: "Set keyframe" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Clear keyframe" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Clear drift" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Set reference" }).hasAttribute("disabled")).toBe(
      false,
    );
    expect(actions.onSetKeyframe).not.toHaveBeenCalled();
    expect(actions.onSetReference).not.toHaveBeenCalled();
  });

  it("enables set keyframe once an assay default or stored reference exists", () => {
    renderRail({ assayDefaultTime: 0 });
    expect(screen.getByRole("button", { name: "Set keyframe" }).hasAttribute("disabled")).toBe(
      false,
    );

    cleanup();
    renderRail({
      drift: drift({ referenceTime: 10, keyframes: [] }),
    });
    expect(screen.queryByText("Reference 10 (2/3)")).toBeNull();
    expect((screen.getByRole("spinbutton", { name: "dx" }) as HTMLInputElement).value).toBe("0");
    expect(screen.getByRole("button", { name: "Set keyframe" }).hasAttribute("disabled")).toBe(
      false,
    );
    expect(screen.queryByText("20 (3/3)")).toBeNull();
  });

  it("reads out an explicit pin and an interpolated time", () => {
    const pinned = renderRail({
      drift: drift({
        keyframes: [{ time: 20, dx: 1.26, dy: -0.04 }],
      }),
      frame: { width: 8, height: 8 },
    });
    expect((screen.getByRole("spinbutton", { name: "dx" }) as HTMLInputElement).value).toBe("1.26");
    expect((screen.getByRole("spinbutton", { name: "dy" }) as HTMLInputElement).value).toBe(
      "-0.04",
    );
    expect(screen.queryByText("Keyframe")).toBeNull();
    expect(screen.queryByText("20 (3/3)")).toBeNull();
    fireEvent.input(screen.getByRole("spinbutton", { name: "dx" }), { target: { value: "2" } });
    fireEvent.blur(screen.getByRole("spinbutton", { name: "dx" }));
    expect(pinned.onDeltaChange).toHaveBeenCalledWith(2, -0.04);
    expect(screen.getByRole("button", { name: "Clear keyframe" }).hasAttribute("disabled")).toBe(
      false,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear keyframe" }));
    expect(pinned.onClearKeyframe).toHaveBeenCalledOnce();

    cleanup();
    const interpolated = renderRail({
      assayDefaultTime: 0,
      drift: drift({
        keyframes: [{ time: 0, dx: 9, dy: -2 }],
      }),
      frame: { width: 8, height: 8 },
    });
    expect((screen.getByRole("spinbutton", { name: "dx" }) as HTMLInputElement).value).toBe("9");
    expect((screen.getByRole("spinbutton", { name: "dy" }) as HTMLInputElement).value).toBe("-2");
    expect(screen.queryByText("Interpolated")).toBeNull();
    expect(screen.queryByText("Set keyframe to move this acquisition time.")).toBeNull();
    expect(screen.getByText("A correction is larger than the frame.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Set keyframe" }));
    expect(interpolated.onSetKeyframe).toHaveBeenCalledOnce();
  });

  it("warns when a pin time is missing and keeps clear drift available", () => {
    const actions = renderRail({
      drift: drift({
        referenceTime: 20,
        keyframes: [{ time: 15, dx: 0, dy: 0 }],
      }),
      frame: { width: 8, height: 8 },
    });
    expect(screen.queryByText("No drift")).toBeNull();
    expect((screen.getByRole("spinbutton", { name: "dx" }) as HTMLInputElement).value).toBe("0");
    expect(screen.queryByText("Interpolated")).toBeNull();
    expect(screen.queryByText("Keyframe")).toBeNull();
    expect(screen.getByText("A keyframe time is not in this scan.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Set reference" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Clear drift" }).hasAttribute("disabled")).toBe(
      false,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear drift" }));
    fireEvent.click(screen.getByRole("button", { name: "Set reference" }));
    expect(actions.onClearDrift).toHaveBeenCalledOnce();
    expect(actions.onSetReference).not.toHaveBeenCalled();
  });
});
