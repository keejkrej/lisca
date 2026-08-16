import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SelectStepperField,
  SliderStepperField,
} from "../src/features/navigation/frame-navigation";

vi.mock("phosphor-icons-solid/IconCaretLeftRegular", () => ({
  default: (props: { class?: string }) => (
    <svg aria-hidden="true" class={props.class} data-testid="caret-left" />
  ),
}));
vi.mock("phosphor-icons-solid/IconCaretRightRegular", () => ({
  default: (props: { class?: string }) => (
    <svg aria-hidden="true" class={props.class} data-testid="caret-right" />
  ),
}));

afterEach(cleanup);

describe("frame-navigation steppers", () => {
  it("shares centered, high-contrast caret buttons across select and slider fields", () => {
    const onPositionPrevious = vi.fn();
    const onPositionNext = vi.fn();

    render(() => (
      <div>
        <SelectStepperField
          label="Position"
          nextDisabled={false}
          onChange={() => undefined}
          onNext={onPositionNext}
          onPrevious={onPositionPrevious}
          options={[
            { label: "04", value: 4 },
            { label: "05", value: 5 },
          ]}
          previousDisabled
          value={4}
        />
        <SliderStepperField
          label="Timepoint"
          max={5}
          min={0}
          onNext={() => undefined}
          onPrevious={() => undefined}
          step={1}
          value={0}
        />
      </div>
    ));

    const previousPosition = screen.getByRole("button", { name: "Previous Position" });
    const nextPosition = screen.getByRole("button", { name: "Next Position" });

    expect(previousPosition.hasAttribute("disabled")).toBe(true);
    expect(nextPosition.hasAttribute("disabled")).toBe(false);
    expect(previousPosition.className).toContain("size-8");
    expect(previousPosition.className).toContain("rounded-full");
    expect(previousPosition.className).toContain("text-foreground");
    expect(previousPosition.querySelector("svg")?.classList.contains("size-4")).toBe(true);
    expect(nextPosition.querySelector("svg")?.classList.contains("size-4")).toBe(true);

    fireEvent.click(nextPosition);
    expect(onPositionNext).toHaveBeenCalledOnce();
    expect(onPositionPrevious).not.toHaveBeenCalled();

    expect(screen.getByRole("button", { name: "Previous Timepoint" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next Timepoint" })).toBeTruthy();
  });
});
