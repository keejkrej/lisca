import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { DesktopUpdateSettings } from "../src/shell/chrome/update-settings";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

afterEach(async () => {
  await cleanupMounted();
  Reflect.deleteProperty(window, "liscaDesktop");
});

describe("DesktopUpdateSettings", () => {
  it("stays hidden when the page is not a desktop app", async () => {
    const view = await mountTest(DesktopUpdateSettings, {});
    expect(view.container.textContent).toBe("");
  });

  it("saves the startup check from Settings", async () => {
    const updateCheckEnabled = vi.fn(async () => true);
    const setUpdateCheckEnabled = vi.fn(async () => undefined);
    Object.defineProperty(window, "liscaDesktop", {
      configurable: true,
      value: { product: "studio", updateCheckEnabled, setUpdateCheckEnabled },
    });

    const view = await mountTest(DesktopUpdateSettings, {});
    const trigger = view.container.querySelector('[aria-label="Settings"]')!;
    clickElement(trigger);
    await flushMicrotasks();

    const toggle = document.querySelector('[aria-label="Check for updates on startup"]')!;
    expect(toggle).not.toBeNull();
    expect(toggle.querySelector("[data-slot='instrument-toggle-indicator']")).toBeTruthy();
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    clickElement(toggle);
    await flushMicrotasks();
    expect(setUpdateCheckEnabled).toHaveBeenCalledWith(false);
  });
});
