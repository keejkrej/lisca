import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { ConnectionStatus, type ConnectionState } from "../src/shell/chrome/connection-status";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

afterEach(cleanupMounted);

describe("ConnectionStatus", () => {
  it.each(["idle", "connecting", "open"] satisfies ConnectionState[])(
    "shows nothing while the server is %s",
    async (state) => {
      const view = await mountTest(ConnectionStatus, { state });
      expect(view.container.textContent).toBe("");
    },
  );

  it("asks for attention when the server is unreachable and retries on demand", async () => {
    const onRetry = vi.fn();
    const view = await mountTest(
      ConnectionStatus,
      { state: "closed" },
      { onEmit: () => onRetry() },
    );

    const chip = view.container.querySelector('[aria-label="Server unreachable"]')!;
    expect(chip.textContent).toContain("Server unreachable");
    clickElement(chip);
    await flushMicrotasks();

    const retry = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Retry now"),
    )!;
    expect(retry).toBeTruthy();
    expect(document.body.textContent).toMatch(/isn't responding/);
    clickElement(retry);
    await flushMicrotasks();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(retry.textContent).toContain("Retrying…");
  });

  it("renders nothing in desktop builds, where the backend runs in-process", async () => {
    Object.defineProperty(window, "liscaDesktop", { configurable: true, value: {} });
    try {
      const view = await mountTest(ConnectionStatus, { state: "closed" });
      expect(view.container.textContent).toBe("");
    } finally {
      Reflect.deleteProperty(window, "liscaDesktop");
    }
  });
});

void Html;
void Schema;
