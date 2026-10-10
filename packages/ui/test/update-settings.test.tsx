import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { DesktopUpdateSettings } from "../src/shell/chrome/update-settings";

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "liscaDesktop");
});

describe("DesktopUpdateSettings", () => {
  it("stays hidden when the page is not a desktop app", () => {
    const view = render(() => <DesktopUpdateSettings />);
    expect(view.container.textContent).toBe("");
  });

  it("saves the startup check from Settings", async () => {
    const updateCheckEnabled = vi.fn(async () => true);
    const setUpdateCheckEnabled = vi.fn(async () => undefined);
    Object.defineProperty(window, "liscaDesktop", {
      configurable: true,
      value: { product: "studio", updateCheckEnabled, setUpdateCheckEnabled },
    });

    render(() => <DesktopUpdateSettings />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const toggle = await screen.findByRole("button", { name: "Check for updates on startup" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(setUpdateCheckEnabled).toHaveBeenCalledWith(false);
  });
});
