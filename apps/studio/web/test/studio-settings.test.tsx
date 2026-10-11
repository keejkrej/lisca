import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioSettings } from "../src/components/studio-settings";

beforeEach(() => {
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
  it("keeps inference deferred when no server ships in this version", async () => {
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Inference" }));

    expect(screen.getAllByText(/no assay is inference-ready/i).length).toBeGreaterThan(0);
    expect(screen.getByText("None")).toBeTruthy();
    const url = screen.getByLabelText("Server address") as HTMLInputElement;
    const token = screen.getByLabelText("Server token") as HTMLInputElement;
    const testConnection = screen.getByRole("button", { name: "Test connection" });
    expect(url.disabled).toBe(true);
    expect(token.disabled).toBe(true);
    expect(testConnection.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Inference" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("button", { name: "Updates" }).getAttribute("aria-current")).toBeNull();
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
