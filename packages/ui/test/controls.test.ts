import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { Button } from "../src/components/ui/button";
import {
  DropdownMenu,
  DROPDOWN_MENU_CONTENT_CLASS,
  DROPDOWN_MENU_ITEM_CLASS,
} from "../src/components/ui/dropdown-menu";
import { Select } from "../src/components/ui/select";
import { Slider } from "../src/components/ui/slider";
import { ToggleGroup } from "../src/components/ui/toggle-group";
import { Tooltip, TOOLTIP_ARROW_CLASS, TOOLTIP_CONTENT_CLASS } from "../src/components/ui/tooltip";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  keyDownElement,
  mountTest,
} from "./render-helper";

afterEach(cleanupMounted);

describe("Effect UI Kit product controls", () => {
  it("keeps disabled button actions from running and follows reactive labels", async () => {
    const action = vi.fn();
    const Msg = UiSchema.TaggedEnum({
      Pressed: {},
      Enable: {},
    });
    const Host = Html.component({
      name: "ButtonTestHost",
      model: Schema.Struct({ disabled: Schema.Boolean, label: Schema.String }),
      message: Msg,
    }).make({
      init: () => ({ disabled: true, label: "Run" }),
      update: {
        Pressed: ($) => {
          action();
          return $.model;
        },
        Enable: ($) => $.set({ disabled: false, label: "Continue" }),
      },
      view: (h, model) =>
        Button(h, { disabled: model.disabled, onPress: Msg.Pressed() }).children(model.label),
    });

    const view = await mountTest(Host, {});
    const btn = view.container.querySelector("button")!;
    expect(btn.textContent).toBe("Run");
    clickElement(btn);
    await flushMicrotasks();
    expect(action).not.toHaveBeenCalled();

    view.root.send(Msg.Enable());
    await flushMicrotasks();
    expect(btn.textContent).toBe("Continue");
    clickElement(btn);
    await flushMicrotasks();
    expect(action).toHaveBeenCalledOnce();
  });

  it("moves a controlled slider with keys and commits the value", async () => {
    const committed = vi.fn();
    const Msg = UiSchema.TaggedEnum({
      Moved: { value: Schema.Number },
      Committed: { value: Schema.Number },
    });
    const Host = Html.component({
      name: "SliderKeyTestHost",
      model: Schema.Struct({ value: Schema.Number }),
      message: Msg,
    }).make({
      init: () => ({ value: 20 }),
      update: {
        Moved: ($, { value }) => $.evolve({ value }),
        Committed: ($, { value }) => {
          committed(value);
          return $.model;
        },
      },
      view: (h, model) =>
        Slider(h, {
          ariaLabel: "Frame",
          value: model.value,
          min: 0,
          max: 30,
          step: 5,
          onValueChange: (value) => Msg.Moved({ value }),
          onValueCommitted: (value) => Msg.Committed({ value }),
        }),
    });

    const view = await mountTest(Host, {});
    const input = view.container.querySelector('input[type="range"]') as HTMLInputElement;
    input.focus();
    keyDownElement(input, "ArrowRight");
    await flushMicrotasks();
    expect(input.value).toBe("25");
    expect(committed).toHaveBeenCalledWith(25);
    keyDownElement(input, "End");
    await flushMicrotasks();
    expect(input.value).toBe("30");
  });

  it("moves focus through toggle groups and updates the controlled selection", async () => {
    const Msg = UiSchema.TaggedEnum({ Changed: { value: Schema.String } });
    const Host = Html.component({
      name: "ToggleGroupTestHost",
      model: Schema.Struct({ value: Schema.String }),
      message: Msg,
    }).make({
      init: () => ({ value: "rect" }),
      update: {
        Changed: ($, { value }) => $.evolve({ value }),
      },
      view: (h, model) =>
        ToggleGroup(h, {
          ariaLabel: "Shape",
          value: model.value ? [model.value] : [],
          items: [
            { value: "rect", content: "Square" },
            { value: "hex", content: "Hex" },
          ],
          onChange: (next) => Msg.Changed({ value: next[0] ?? "" }),
        }),
    });

    const view = await mountTest(Host, {});
    const [square, hex] = [...view.container.querySelectorAll("button")];
    expect(square!.getAttribute("data-slot")).toBe("toggle");
    expect(square!.getAttribute("data-lisca-slot")).toBe("toggle-group-item");
    square!.focus();
    keyDownElement(square!, "ArrowRight");
    await flushMicrotasks();
    expect(document.activeElement).toBe(hex);
    clickElement(hex!);
    await flushMicrotasks();
    expect(hex!.getAttribute("aria-pressed")).toBe("true");
    expect(square!.getAttribute("aria-pressed")).toBe("false");
  });

  it("opens a controlled select, updates selection, and closes", async () => {
    const Msg = UiSchema.TaggedEnum({
      SetOpen: { open: Schema.Boolean },
      Picked: { value: Schema.NullOr(Schema.String) },
    });
    const Host = Html.component({
      name: "SelectTestHost",
      model: Schema.Struct({ open: Schema.Boolean, value: Schema.NullOr(Schema.String) }),
      message: Msg,
    }).make({
      init: () => ({ open: false, value: "a" }),
      update: {
        SetOpen: ($, { open }) => $.evolve({ open }),
        Picked: ($, { value }) => $.evolve({ value, open: false }),
      },
      view: (h, model) =>
        Select(h, {
          ariaLabel: "Position",
          open: model.open,
          value: model.value,
          items: [
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ],
          onOpenChange: (open) => Msg.SetOpen({ open }),
          onChange: (value) => Msg.Picked({ value }),
        }),
    });

    const view = await mountTest(Host, {});
    const trigger = view.container.querySelector('[role="combobox"]') as HTMLButtonElement;
    expect(trigger.textContent).toContain("Alpha");
    trigger.click();
    await flushMicrotasks();

    const options = [...document.querySelectorAll('[role="option"]')];
    const beta = options.find((el) => el.textContent?.includes("Beta")) as HTMLElement | undefined;
    expect(beta).toBeTruthy();
    beta!.click();
    await flushMicrotasks();
    expect(trigger.textContent).toContain("Beta");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens a menu, runs an item once, and dismisses", async () => {
    const action = vi.fn();
    const Msg = UiSchema.TaggedEnum({
      SetOpen: { open: Schema.Boolean },
      Picked: { value: Schema.String },
    });
    const Host = Html.component({
      name: "MenuTestHost",
      model: Schema.Struct({ open: Schema.Boolean }),
      message: Msg,
    }).make({
      init: () => ({ open: false }),
      update: {
        SetOpen: ($, { open }) => $.evolve({ open }),
        Picked: ($) => {
          action();
          return $.evolve({ open: false });
        },
      },
      view: (h, model) =>
        DropdownMenu(h, {
          props: {
            open: model.open,
            items: [{ value: "folder", label: "Folder" }],
          },
          onEmit: {
            RequestedOpen: () => Msg.SetOpen({ open: true }),
            RequestedClose: () => Msg.SetOpen({ open: false }),
            Picked: ({ value }) => Msg.Picked({ value }),
            Highlighted: () => undefined,
            RequestedQuery: () => undefined,
            Settled: () => undefined,
          },
          view: (menu) =>
            h.div.children(
              menu.trigger({ element: h.button }).children("Browse"),
              menu.mounted
                ? menu.positioner(h.div).children(
                    menu
                      .popup(h.div)
                      .class(DROPDOWN_MENU_CONTENT_CLASS)
                      .children(
                        menu
                          .item({ element: h.div.key("folder"), value: "folder" })
                          .class(DROPDOWN_MENU_ITEM_CLASS)
                          .children("Folder"),
                      ),
                  )
                : undefined,
            ),
        }),
    });

    const view = await mountTest(Host, {});
    const trigger = view.container.querySelector("button")!;
    trigger.click();
    await flushMicrotasks();
    const item = document.querySelector('[role="menuitem"]') as HTMLElement | null;
    expect(item).not.toBeNull();
    expect(item!.textContent).toContain("Folder");
    item!.click();
    await flushMicrotasks();
    expect(action).toHaveBeenCalledOnce();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows a tooltip when opened and renders its description", async () => {
    const Msg = UiSchema.TaggedEnum({ SetOpen: { open: Schema.Boolean } });
    const Host = Html.component({
      name: "TooltipTestHost",
      model: Schema.Struct({ open: Schema.Boolean }),
      message: Msg,
    }).make({
      init: () => ({ open: true }),
      update: { SetOpen: ($, { open }) => $.evolve({ open }) },
      view: (h, model) =>
        Tooltip(h, {
          props: { open: model.open, delay: 0, describesTrigger: true },
          onEmit: {
            RequestedOpen: () => Msg.SetOpen({ open: true }),
            RequestedClose: () => Msg.SetOpen({ open: false }),
          },
          view: (tooltip) =>
            h.div.children(
              tooltip.trigger(h.button).children("Help"),
              tooltip
                .positioner(h.div)
                .children(
                  tooltip
                    .popup(h.div)
                    .class(TOOLTIP_CONTENT_CLASS)
                    .children(
                      "Choose a workspace",
                      tooltip.arrow(h.div).class(TOOLTIP_ARROW_CLASS),
                    ),
                ),
            ),
        }),
    });

    await mountTest(Host, {});
    await flushMicrotasks();
    const tip = document.querySelector('[role="tooltip"]')!;
    expect(tip).not.toBeNull();
    expect(tip.textContent).toContain("Choose a workspace");
  });
});
