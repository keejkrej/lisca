import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AgentActivity } from "../src/components/agent-activity";

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

afterEach(() => {
  cleanup();
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

    render(() => <AgentActivity />);
    expect(await screen.findByText(/Cropping Pos41/)).toBeTruthy();
    expect(screen.getByText(/12\/100 ROI frames/)).toBeTruthy();
    expect(main.inert).toBe(true);
    expect(right.inert).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Take over" }));
    expect(controlTakeover).toHaveBeenCalledWith("c:/data/demo");
    expect(await screen.findByText("You have control")).toBeTruthy();
    expect(main.inert).toBe(false);
    expect(right.inert).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Hand back" }));
    expect(controlHandback).toHaveBeenCalledWith("c:/data/demo");
    await waitFor(() => expect(main.inert).toBe(true));
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
    render(() => <AgentActivity />);
    expect(await screen.findByText("pi agent is controlling")).toBeTruthy();
    expect(screen.queryByText(/Agent active/)).toBeNull();
  });

  it("renders nothing when no agent owns a workspace", () => {
    Object.defineProperty(window, "liscaDesktop", {
      configurable: true,
      value: { product: "studio", controlList: async () => [] },
    });
    const { container } = render(() => <AgentActivity />);
    expect(container.querySelector("[data-agent-state]")).toBeNull();
  });
});
