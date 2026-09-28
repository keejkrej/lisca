import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { ConnectionStatus, type ConnectionState } from "../src/shell/chrome/connection-status";

afterEach(cleanup);

describe("ConnectionStatus", () => {
  it.each(["idle", "connecting", "open"] satisfies ConnectionState[])(
    "shows nothing while the server is %s",
    (state) => {
      const view = render(() => <ConnectionStatus state={state} />);
      expect(view.container.textContent).toBe("");
    },
  );

  it("asks for attention when the server is unreachable and retries on demand", async () => {
    const onRetry = vi.fn();
    const view = render(() => <ConnectionStatus state="closed" onRetry={onRetry} />);

    const chip = view.getByRole("button", { name: "Server unreachable" });
    expect(chip.textContent).toContain("Server unreachable");
    fireEvent.click(chip);

    // The popover renders in a portal outside the view container.
    const retry = await screen.findByRole("button", { name: "Retry now" });
    expect(screen.getByText(/localhost:3000 isn't responding/)).toBeTruthy();
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Retrying…" })).toBeTruthy();
  });

  it("renders nothing in desktop builds, where the backend runs in-process", () => {
    Object.defineProperty(window, "liscaDesktop", { configurable: true, value: {} });
    try {
      const view = render(() => <ConnectionStatus state="closed" />);
      expect(view.container.textContent).toBe("");
    } finally {
      Reflect.deleteProperty(window, "liscaDesktop");
    }
  });
});
