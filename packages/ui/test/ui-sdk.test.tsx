import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { definePrimitive } from "@ui-sdk/core";
import { toggle } from "@ui-sdk/core/toggle";
import { createSignal } from "solid-js";
import { render as renderDom } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createParts } from "../src/lib/ui-sdk";

afterEach(cleanup);

describe("UI SDK Solid 1 renderer", () => {
  const Toggle = createParts(toggle, { root: "button" });

  it("renders uncontrolled behavior and follows reactive controlled options", async () => {
    const [pressed, setPressed] = createSignal(false);
    const [disabled, setDisabled] = createSignal(false);
    const changed = vi.fn();
    const view = render(() => (
      <>
        <Toggle.Root onPressedChange={changed}>Uncontrolled</Toggle.Root>
        <Toggle.Root pressed={pressed()} disabled={disabled()}>
          Controlled
        </Toggle.Root>
      </>
    ));
    const uncontrolled = view.getByRole("button", { name: "Uncontrolled" });
    const controlled = view.getByRole("button", { name: "Controlled" });
    expect(uncontrolled.getAttribute("aria-pressed")).toBe("false");
    await fireEvent.click(uncontrolled);
    expect(changed).toHaveBeenCalledWith(true, expect.any(Object));
    expect(uncontrolled.getAttribute("aria-pressed")).toBe("true");
    setPressed(true);
    setDisabled(true);
    expect(controlled.getAttribute("aria-pressed")).toBe("true");
    expect(controlled.hasAttribute("disabled")).toBe(true);
    setPressed(false);
    setDisabled(false);
    expect(controlled.getAttribute("aria-pressed")).toBe("false");
    expect(controlled.hasAttribute("disabled")).toBe(false);
  });

  it("runs author handlers first and respects canceled events", async () => {
    const changed = vi.fn();
    const view = render(() => (
      <Toggle.Root onPressedChange={changed} onClick={(event) => event.preventDefault()}>
        Cancel
      </Toggle.Root>
    ));
    const button = view.getByRole("button", { name: "Cancel" });
    await fireEvent.click(button);
    expect(changed).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("binds conditional parts after insertion and releases them on hide or unmount", async () => {
    const bound = vi.fn();
    const released = vi.fn();
    const primitive = definePrimitive({
      name: "test-panel",
      options: { open: "boolean" },
      state: (options: { open: boolean }) => ({ open: options.open }),
      sync: (options) => ({ open: options.open }),
      api: () => ({}),
      slots: (slot) => ({
        panel: slot({
          present: (state) => state.open,
          attrs: () => ({ "aria-label": "Generated label" }),
          bind: (element) => {
            bound(element.isConnected);
            return released;
          },
        }),
      }),
    });
    const Parts = createParts(primitive, { panel: "div" });
    const [open, setOpen] = createSignal(false);
    const view = render(() => (
      <Parts.Root open={open()}>
        <Parts.Panel id="authored-id" aria-label="Author label" data-lisca-slot="product-panel">
          Panel
        </Parts.Panel>
      </Parts.Root>
    ));
    expect(view.queryByText("Panel")).toBeNull();
    setOpen(true);
    await Promise.resolve();
    expect(bound).toHaveBeenCalledExactlyOnceWith(true);
    expect(view.getByText("Panel").getAttribute("aria-label")).toBe("Author label");
    expect(view.getByText("Panel").id).toBe("authored-id");
    expect(view.getByText("Panel").getAttribute("data-lisca-slot")).toBe("product-panel");
    expect(view.getByText("Panel").getAttribute("data-slot")).toBe("test-panel-panel");
    setOpen(false);
    expect(view.queryByText("Panel")).toBeNull();
    expect(released).toHaveBeenCalledTimes(1);
    setOpen(true);
    await Promise.resolve();
    view.unmount();
    await Promise.resolve();
    expect(bound).toHaveBeenCalledTimes(2);
    expect(released).toHaveBeenCalledTimes(2);
  });

  it("inherits keyed slot props and updates them when the item changes", () => {
    const primitive = definePrimitive({
      name: "test-items",
      state: () => ({}),
      api: () => ({ internal: { keyOf: (value: string) => `key-${value}` } }),
      slots: (slot) => ({
        item: slot<{ value: string }>({
          props: { value: "key" },
        }),
        caption: slot<{ value?: string }>({
          props: { value: { kind: "string", from: "item", required: true } },
          attrs: (_, context) => ({ "data-key": context.props.value }),
        }),
      }),
    });
    const Parts = createParts(primitive, { item: "div", caption: "span" });
    const [value, setValue] = createSignal("first");
    const view = render(() => (
      <Parts.Root>
        <Parts.Item value={value()}>
          <Parts.Caption>Caption</Parts.Caption>
        </Parts.Item>
      </Parts.Root>
    ));
    expect(view.getByText("Caption").getAttribute("data-key")).toBe("key-first");
    setValue("second");
    expect(view.getByText("Caption").getAttribute("data-key")).toBe("key-second");
  });

  it("keeps descendants and their focus when a parent's attributes change", () => {
    const primitive = definePrimitive({
      name: "test-parent",
      options: { active: "boolean" },
      state: (options: { active: boolean }) => ({ active: options.active }),
      sync: (options) => ({ active: options.active }),
      api: () => ({}),
      slots: (slot) => ({
        root: slot({ attrs: (state) => ({ "data-active": String(state.active) }) }),
      }),
    });
    const Parts = createParts(primitive, { root: "div" });
    const [active, setActive] = createSignal(false);
    const view = render(() => (
      <Parts.Root active={active()}>
        <input aria-label="Draft" />
      </Parts.Root>
    ));
    const input = view.getByRole("textbox", { name: "Draft" });
    input.focus();
    setActive(true);
    expect(view.getByRole("textbox", { name: "Draft" })).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.parentElement?.getAttribute("data-active")).toBe("true");
  });

  it("waits for a detached mount to enter the document before binding behavior", async () => {
    const bound = vi.fn();
    const primitive = definePrimitive({
      name: "test-connected",
      state: () => ({}),
      api: () => ({}),
      slots: (slot) => ({
        root: slot({
          bind: (element) => {
            bound(element.isConnected);
          },
        }),
      }),
    });
    const Parts = createParts(primitive, { root: "div" });
    const container = document.createElement("div");
    const dispose = renderDom(() => <Parts.Root />, container);
    try {
      expect(bound).not.toHaveBeenCalled();
      document.body.append(container);
      await Promise.resolve();
      expect(bound).toHaveBeenCalledExactlyOnceWith(true);
    } finally {
      dispose();
      container.remove();
    }
  });
});
