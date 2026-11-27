import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AgentActivity } from "../src/components/agent-activity";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  mountTest,
  waitForCondition,
} from "./render-helper";

const running = {
  workspacePath: "c:/data/demo",
  mode: "agent-running",
  agentName: "Claude Code",
  operation: {
    requestId: "crop-1",
    kind: "crop",
    label: "Cropping Pos41",
    detail: "12/100 ROI frames",
  },
  revision: 3,
} as const;

const AgentActivityHost = Html.component({
  name: "AgentActivityTestHost",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: {},
  view: (h) => AgentActivity(h),
});

function findButtonByName(root: ParentNode, name: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll("button")).find(
    (button) => (button.getAttribute("aria-label") ?? button.textContent?.trim()) === name,
  );
}

afterEach(async () => {
  await cleanupMounted();
  Reflect.deleteProperty(window, "liscaDesktop");
});

describe("AgentActivity", () => {
  it("shows the current agent operation and lets the user take over and hand back", async () => {
    const main = document.createElement("main");
    main.id = "main-content";
    document.body.append(main);
    const right = document.createElement("aside");
    right.setAttribute("aria-label", "Right panel");
    document.body.append(right);
    let state: Record<string, unknown> = running;
    const controlList = vi.fn(async () => [state]);
    const controlTakeover = vi.fn(async () => {
      state = { ...running, mode: "user-takeover", operation: undefined };
      return state;
    });
    const controlHandback = vi.fn(async () => {
      state = { ...running, mode: "agent-running", operation: undefined };
      return state;
    });
    Object.defineProperty(window, "liscaDesktop", {
      configurable: true,
      value: {
        product: "studio",
        controlList,
        controlTakeover,
        controlHandback,
        controlPause: vi.fn(),
        controlStop: vi.fn(),
      },
    });

    const { container } = await mountTest(AgentActivityHost, {});
    await waitForCondition(() => container.textContent?.includes("Cropping Pos41"));
    expect(container.textContent).toContain("12/100 ROI frames");
    await waitForCondition(() => main.inert === true && right.inert === true);

    const takeoverButton = findButtonByName(container, "Take over");
    expect(takeoverButton).toBeTruthy();
    clickElement(takeoverButton!);
    await waitForCondition(() => controlTakeover.mock.calls.length === 1);
    expect(controlTakeover).toHaveBeenCalledWith("c:/data/demo");
    await waitForCondition(() => container.textContent?.includes("You have control"));
    await waitForCondition(() => main.inert === false && right.inert === false);

    const handbackButton = findButtonByName(container, "Hand back");
    expect(handbackButton).toBeTruthy();
    clickElement(handbackButton!);
    await waitForCondition(() => controlHandback.mock.calls.length === 1);
    expect(controlHandback).toHaveBeenCalledWith("c:/data/demo");
    await waitForCondition(() => main.inert === true);
    main.remove();
    right.remove();
  });

  it("shows only the agent name when there is no active operation", async () => {
    Object.defineProperty(window, "liscaDesktop", {
      configurable: true,
      value: {
        product: "studio",
        controlList: async () => [
          { workspacePath: "c:/data/demo", mode: "agent-running", agentName: "pi", revision: 2 },
        ],
      },
    });
    const { container } = await mountTest(AgentActivityHost, {});
    await waitForCondition(() => container.textContent?.includes("pi agent is controlling"));
    expect(container.textContent).not.toMatch(/Agent active/);
  });

  it("renders nothing when no agent owns a workspace", async () => {
    Object.defineProperty(window, "liscaDesktop", {
      configurable: true,
      value: { product: "studio", controlList: async () => [] },
    });
    const { container } = await mountTest(AgentActivityHost, {});
    await flushMicrotasks();
    expect(container.querySelector("[data-agent-state]")).toBeNull();
  });
});
