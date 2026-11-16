import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { Button } from "../src/components/ui/button";
import { Slider } from "../src/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "../src/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../src/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../src/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../src/components/ui/tooltip";

afterEach(cleanup);

describe("UI SDK product controls", () => {
  it("keeps disabled button actions from running and follows reactive labels", async () => {
    const action = vi.fn();
    const [disabled, setDisabled] = createSignal(true);
    const [label, setLabel] = createSignal("Run");
    const view = render(() => (
      <Button disabled={disabled()} onClick={action}>
        {label()}
      </Button>
    ));
    await fireEvent.click(view.getByRole("button", { name: "Run" }));
    expect(action).not.toHaveBeenCalled();
    setDisabled(false);
    setLabel("Continue");
    await fireEvent.click(view.getByRole("button", { name: "Continue" }));
    expect(action).toHaveBeenCalledOnce();
  });

  it("moves a controlled slider with keys and commits the final value on keyup", async () => {
    const committed = vi.fn();
    const [value, setValue] = createSignal(20);
    const view = render(() => (
      <Slider
        aria-label="Frame"
        value={value()}
        min={0}
        max={30}
        step={5}
        onValueChange={setValue}
        onValueCommitted={committed}
      />
    ));
    const input = view.getByRole("slider", { name: "Frame" }) as HTMLInputElement;
    input.focus();
    await fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(view.getByRole("slider", { name: "Frame" })).toBe(input);
    expect(value()).toBe(25);
    expect(input.value).toBe("25");
    expect(committed).not.toHaveBeenCalled();
    await fireEvent.keyUp(input, { key: "ArrowRight" });
    expect(committed).toHaveBeenCalledWith(25);
    await fireEvent.keyDown(input, { key: "End" });
    expect(value()).toBe(30);
  });

  it("moves focus through toggle groups and updates the controlled selection", async () => {
    const [value, setValue] = createSignal("rect");
    const view = render(() => (
      <ToggleGroup aria-label="Shape" value={value()} onChange={(next) => setValue(String(next))}>
        <ToggleGroupItem value="rect">Square</ToggleGroupItem>
        <ToggleGroupItem value="hex">Hex</ToggleGroupItem>
      </ToggleGroup>
    ));
    const square = view.getByRole("button", { name: "Square" });
    const hex = view.getByRole("button", { name: "Hex" });
    expect(square.getAttribute("data-slot")).toBe("toggle");
    expect(square.getAttribute("data-lisca-slot")).toBe("toggle-group-item");
    square.focus();
    await fireEvent.keyDown(square, { key: "ArrowRight" });
    expect(view.getByRole("button", { name: "Hex" })).toBe(hex);
    expect(document.activeElement).toBe(hex);
    await fireEvent.click(hex);
    expect(value()).toBe("hex");
    expect(hex.getAttribute("aria-pressed")).toBe("true");
    expect(square.getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps object-valued select options distinct and closes after keyboard selection", async () => {
    const choices = [
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" },
    ];
    const [value, setValue] = createSignal(choices[0]);
    const view = render(() => (
      <form>
        <Select
          name="position"
          options={choices}
          value={value()}
          optionValue={(item) => item.id}
          optionTextValue={(item) => item.label}
          onChange={(next) => next && setValue(next)}
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
          )}
        >
          <SelectTrigger aria-label="Position">
            <SelectValue>
              {(state) => (state.selectedOption() as (typeof choices)[number])?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
      </form>
    ));
    const trigger = view.getByRole("combobox", { name: "Position" });
    trigger.focus();
    await fireEvent.click(trigger);
    const beta = await view.findByRole("option", { name: "Beta" });
    expect(view.getByRole("option", { name: "Alpha" }).id).not.toBe(beta.id);
    await fireEvent.keyDown(view.getByRole("option", { name: "Alpha" }), { key: "ArrowDown" });
    expect(document.activeElement).toBe(beta);
    await fireEvent.keyDown(beta, { key: "Enter" });
    expect(value()).toBe(choices[1]);
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    expect(trigger.textContent).toContain("Beta");
    expect(new FormData(view.container.querySelector("form")!).get("position")).toBe("b");
  });

  it("updates option labels and disabled state while a select stays open", async () => {
    const choices = ["a", "b"];
    const [label, setLabel] = createSignal("Beta");
    const [disabled, setDisabled] = createSignal(false);
    const changed = vi.fn();
    const view = render(() => (
      <Select
        options={choices}
        value="a"
        optionTextValue={(value) => (value === "a" ? "Alpha" : label())}
        optionDisabled={(value) => value === "b" && disabled()}
        onChange={changed}
      >
        <SelectTrigger aria-label="Choice">
          <SelectValue />
        </SelectTrigger>
        <SelectContent />
      </Select>
    ));
    await fireEvent.click(view.getByRole("combobox", { name: "Choice" }));
    const beta = await view.findByRole("option", { name: "Beta" });
    setLabel("Updated Beta");
    expect(view.getByRole("option", { name: "Updated Beta" })).toBe(beta);
    setDisabled(true);
    expect(beta.getAttribute("aria-disabled")).toBe("true");
    expect(beta.hasAttribute("data-disabled")).toBe(true);
    await fireEvent.click(beta);
    expect(changed).not.toHaveBeenCalled();
    setDisabled(false);
    expect(beta.hasAttribute("aria-disabled")).toBe(false);
    expect(beta.hasAttribute("data-disabled")).toBe(false);
    await fireEvent.click(beta);
    expect(changed).toHaveBeenCalledOnce();
    expect(changed.mock.calls[0]?.[0]).toBe("b");
  });

  it("opens a menu with the keyboard, runs an item once, and dismisses", async () => {
    const action = vi.fn();
    const view = render(() => (
      <DropdownMenu>
        <DropdownMenuTrigger>Browse</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={action}>Folder</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ));
    const trigger = view.getByRole("button", { name: "Browse" });
    trigger.focus();
    await fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const item = await view.findByRole("menuitem", { name: "Folder" });
    await fireEvent.click(item);
    expect(action).toHaveBeenCalledOnce();
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
  });

  it("shows a tooltip on keyboard focus and dismisses on Escape", async () => {
    const view = render(() => (
      <Tooltip openDelay={0}>
        <TooltipTrigger>Help</TooltipTrigger>
        <TooltipContent>Choose a workspace</TooltipContent>
      </Tooltip>
    ));
    const trigger = view.getByRole("button", { name: "Help" });
    trigger.focus();
    await fireEvent.focusIn(trigger);
    const tip = await view.findByRole("tooltip");
    expect(tip.textContent).toContain("Choose a workspace");
    await fireEvent.keyDown(trigger, { key: "Escape" });
    await waitFor(() => expect(view.queryByRole("tooltip")).toBeNull());
  });
});
