import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  FrameNavigation,
  SelectStepperField,
  SliderStepperField,
} from "../src/navigation/frame-navigation";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  keyDownElement,
  mountTest,
} from "./render-helper";

afterEach(cleanupMounted);

describe("frame-navigation steppers", () => {
  it("shares centered, high-contrast caret buttons across select and slider fields", async () => {
    const onPositionPrevious = vi.fn();
    const onPositionNext = vi.fn();

    const Msg = UiSchema.TaggedEnum({
      Noop: {},
      PrevPos: {},
      NextPos: {},
    });

    const Host = Html.component({
      name: "FrameNavSteppersHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: {
        Noop: ($) => $.model,
        PrevPos: ($) => {
          onPositionPrevious();
          return $.model;
        },
        NextPos: ($) => {
          onPositionNext();
          return $.model;
        },
      },
      view: (h) =>
        h.div.children(
          SelectStepperField(h, {
            label: "Position",
            nextDisabled: false,
            onChange: () => Msg.Noop(),
            onNext: Msg.NextPos(),
            onPrevious: Msg.PrevPos(),
            options: [
              { label: "04", value: 4 },
              { label: "05", value: 5 },
            ],
            previousDisabled: true,
            value: 4,
          }),
          SliderStepperField(h, {
            label: "Frame",
            max: 5,
            min: 0,
            onNext: Msg.Noop(),
            onPrevious: Msg.Noop(),
            step: 1,
            value: 0,
          }),
        ),
    });

    const { container } = await mountTest(Host, {});

    const previousPosition = container.querySelector(
      'button[aria-label="Previous Position"]',
    ) as HTMLButtonElement;
    const nextPosition = container.querySelector(
      'button[aria-label="Next Position"]',
    ) as HTMLButtonElement;

    expect(previousPosition).not.toBeNull();
    expect(nextPosition).not.toBeNull();
    expect(previousPosition.hasAttribute("disabled")).toBe(true);
    expect(nextPosition.hasAttribute("disabled")).toBe(false);
    expect(previousPosition.className).toContain("size-8");
    expect(previousPosition.className).not.toContain("rounded-full");
    expect(previousPosition.className).toContain("text-foreground");
    expect(previousPosition.querySelector("svg")?.classList.contains("size-4")).toBe(true);
    expect(nextPosition.querySelector("svg")?.classList.contains("size-4")).toBe(true);

    clickElement(nextPosition);
    await flushMicrotasks();
    expect(onPositionNext).toHaveBeenCalledOnce();
    expect(onPositionPrevious).not.toHaveBeenCalled();

    expect(container.querySelector('button[aria-label="Previous Frame"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Next Frame"]')).toBeTruthy();
  });
});

describe("SelectStepperField controlled value", () => {
  it("does not echo onChange when the value or options change programmatically", async () => {
    const onChange = vi.fn();

    const Msg = UiSchema.TaggedEnum({
      Changed: { value: Schema.Number },
      SetState: {
        value: Schema.Number,
        options: Schema.Array(Schema.Struct({ label: Schema.String, value: Schema.Number })),
      },
      Noop: {},
    });

    const Host = Html.component({
      name: "SelectStepperControlledHost",
      props: Schema.Struct({}),
      model: Schema.Struct({
        value: Schema.Number,
        options: Schema.Array(Schema.Struct({ label: Schema.String, value: Schema.Number })),
      }),
      message: Msg,
    }).make({
      init: () => ({
        value: 4,
        options: [
          { label: "04", value: 4 },
          { label: "05", value: 5 },
        ],
      }),
      update: {
        Changed: ($, { value }) => {
          onChange(value);
          return $.model;
        },
        SetState: ($, { value, options }) => $.evolve({ value, options }),
        Noop: ($) => $.model,
      },
      view: (h, model) =>
        SelectStepperField(h, {
          label: "Position",
          nextDisabled: false,
          onChange: (value) => Msg.Changed({ value }),
          onNext: Msg.Noop(),
          onPrevious: Msg.Noop(),
          options: model.options,
          previousDisabled: false,
          value: model.value,
        }),
    });

    const { root } = await mountTest(Host, {});

    root.send(
      Msg.SetState({
        value: 5,
        options: [
          { label: "04", value: 4 },
          { label: "05", value: 5 },
        ],
      }),
    );
    root.send(
      Msg.SetState({
        value: 6,
        options: [
          { label: "05", value: 5 },
          { label: "06", value: 6 },
        ],
      }),
    );
    await flushMicrotasks();

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("FrameNavigation bracket shortcuts", () => {
  it("steps Frame with [ and ] outside inputs and dialogs", async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();

    const Msg = UiSchema.TaggedEnum({
      Prev: {},
      Next: {},
    });

    const Host = Html.component({
      name: "FrameNavShortcutsHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: {
        Prev: ($) => {
          onPrevious();
          return $.model;
        },
        Next: ($) => {
          onNext();
          return $.model;
        },
      },
      view: (h) =>
        h.div.children(
          FrameNavigation(h, {
            frame: {
              value: 1,
              min: 0,
              max: 3,
              step: 1,
              previousDisabled: false,
              nextDisabled: false,
              onPrevious: Msg.Prev(),
              onNext: Msg.Next(),
            },
          }),
          h.input.attr("aria-label", "Search"),
        ),
    });

    const { container } = await mountTest(Host, {});
    await flushMicrotasks();

    keyDownElement(document, "[");
    await flushMicrotasks();
    expect(onPrevious).toHaveBeenCalledOnce();

    keyDownElement(document, "]");
    await flushMicrotasks();
    expect(onNext).toHaveBeenCalledOnce();

    const input = container.querySelector('input[aria-label="Search"]') as HTMLInputElement;
    keyDownElement(input, "[");
    keyDownElement(input, "]");
    await flushMicrotasks();
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });
});
