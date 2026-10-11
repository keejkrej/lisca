import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioSettings } from "../src/components/studio-settings";

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "liscaDesktop");
});

function openSettings() {
  render(() => <StudioSettings />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
}

describe("StudioSettings", () => {
  it("keeps inference deferred when no server ships in this version", async () => {
    openSettings();
    fireEvent.click(screen.getByRole("tab", { name: "Inference" }));

    expect(screen.getAllByText(/no assay is inference-ready/i).length).toBeGreaterThan(0);
    expect(screen.getByText("None")).toBeTruthy();
    const url = screen.getByLabelText("Server address") as HTMLInputElement;
    const token = screen.getByLabelText("Server token") as HTMLInputElement;
    const testConnection = screen.getByRole("button", { name: "Test connection" });
    expect(url.disabled).toBe(true);
    expect(token.disabled).toBe(true);
    expect(testConnection.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("tab", { name: "Inference" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("explains desktop update checks in the browser", () => {
    openSettings();
    expect(screen.getByRole("tab", { name: "Updates" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tablist").getAttribute("aria-orientation")).toBe("vertical");
    expect(screen.getByText(/desktop app checks for updates/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Check for updates on startup" })).toBeNull();
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
