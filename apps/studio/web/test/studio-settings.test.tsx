import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioSettings } from "../src/components/studio-settings";

const unconfiguredHealth = {
  apiVersion: 1,
  provider: "openrouter",
  configured: false,
  modelId: "google/gemini-embedding-2",
  revision: "v1",
  dimensions: 768,
  batchSize: 32,
  cacheCap: 4096,
};

let fetchHandler: typeof fetch = async () => Response.json(unconfiguredHealth);
const fetchImpl: typeof fetch = (input, init) => fetchHandler(input, init);

beforeEach(() => {
  fetchHandler = async () => Response.json(unconfiguredHealth);
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
  it("shows OpenRouter API key configuration with no endpoint URL field", async () => {
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Inference" }));

    expect(await screen.findByText(/No OpenRouter API key is configured yet/i)).toBeTruthy();
    expect(screen.getByText("google/gemini-embedding-2 (768 dimensions)")).toBeTruthy();
    expect(screen.queryByLabelText("Server address")).toBeNull();
    const keyInput = screen.getByLabelText("OpenRouter API key") as HTMLInputElement;
    expect(keyInput.disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Save API key" }).hasAttribute("disabled")).toBe(
      false,
    );
    expect(screen.getByRole("button", { name: "Inference" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("button", { name: "Updates" }).getAttribute("aria-current")).toBeNull();
  });

  it("saves the OpenRouter API key and updates status to configured", async () => {
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const method = input instanceof Request ? input.method : (init?.method ?? "GET");
      if (method === "POST" && url.includes("/studio/label-free/key")) {
        return Response.json({
          ...unconfiguredHealth,
          configured: true,
        });
      }
      return Response.json(unconfiguredHealth);
    });
    fetchHandler = transport;

    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Inference" }));
    const keyInput = (await screen.findByLabelText("OpenRouter API key")) as HTMLInputElement;
    fireEvent.input(keyInput, { target: { value: "sk-or-v1-test" } });
    fireEvent.click(screen.getByRole("button", { name: "Save API key" }));

    expect(await screen.findByText(/OpenRouter API key is configured/i)).toBeTruthy();
    expect(screen.getByText(/OpenRouter API key saved for this session/i)).toBeTruthy();
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
