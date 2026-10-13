import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioSettings } from "../src/components/studio-settings";

const lightHealth = {
  apiVersion: 1,
  runtime: "embedded",
  build: "light",
  cudaBundled: false,
  modelId: null,
  revision: null,
  dimensions: null,
  device: null,
  batchSize: 0,
  queueDepth: 0,
  cacheCap: 0,
};

let fetchHandler: typeof fetch = async () => Response.json(lightHealth);
const fetchImpl: typeof fetch = (input, init) => fetchHandler(input, init);

beforeEach(() => {
  fetchHandler = async () => Response.json(lightHealth);
  vi.stubGlobal("fetch", fetchImpl);
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: () => undefined,
      matches: false,
      media: query,
      removeEventListener: () => undefined,
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "liscaDesktop");
});

function openSettings() {
  render(() => <StudioSettings />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
}

describe("StudioSettings", () => {
  it("describes the light build when the label-free server is not mounted", async () => {
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Inference" }));

    expect(await screen.findByText(/light Studio build/i)).toBeTruthy();
    expect(screen.getByText("None in this build")).toBeTruthy();
    const url = screen.getByLabelText("Server address") as HTMLInputElement;
    const token = screen.getByLabelText("Server token") as HTMLInputElement;
    expect(url.disabled).toBe(false);
    expect(token.disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Test connection" }).hasAttribute("disabled")).toBe(
      false,
    );
    expect(screen.getByRole("button", { name: "Inference" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("button", { name: "Updates" }).getAttribute("aria-current")).toBeNull();
  });

  it("shows the bundled CUDA flag on a label-free build", async () => {
    fetchHandler = async () =>
      Response.json({
        apiVersion: 1,
        runtime: "embedded",
        build: "label-free",
        cudaBundled: true,
        modelId: "cpu-microscopy",
        revision: "v1",
        dimensions: 43,
        device: "cpu",
        batchSize: 32,
        queueDepth: 0,
        cacheCap: 4096,
      });
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Inference" }));
    expect(await screen.findByText(/CUDA ONNX runtime is bundled/i)).toBeTruthy();
    expect(screen.getByText("cpu-microscopy v1")).toBeTruthy();
  });

  it("explains desktop update checks in the browser", () => {
    render(() => <StudioSettings />);
    const gear = screen.getByRole("button", { name: "Settings" });
    expect(gear.className).toContain("z-button-variant-outline");
    fireEvent.click(gear);
    expect(screen.getByRole("button", { name: "Updates" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText(/desktop app checks for updates/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Check for updates on startup" })).toBeNull();
    document.cookie = "sidebar_state=; path=/; max-age=0";
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", metaKey: true, bubbles: true, cancelable: true }),
    );
    expect(document.cookie).not.toContain("sidebar_state=");
  });

  it("saves the startup check from the Updates tab", async () => {
    const updateCheckEnabled = vi.fn(async () => true);
    const setUpdateCheckEnabled = vi.fn(async () => undefined);
    Object.defineProperty(window, "liscaDesktop", {
      configurable: true,
      value: { product: "studio", updateCheckEnabled, setUpdateCheckEnabled },
    });

    openSettings();
    const toggle = await screen.findByRole("button", { name: "Check for updates on startup" });
    expect(toggle.querySelector("[data-slot='instrument-toggle-indicator']")).toBeTruthy();
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(setUpdateCheckEnabled).toHaveBeenCalledWith(false);
  });
});
