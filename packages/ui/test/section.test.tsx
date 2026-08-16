import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import { PanelSection } from "../src/shell/regions/panel-section";

afterEach(cleanup);

describe("PanelSection appearance", () => {
  it("keeps framed as the default and exposes an opt-in rail treatment", () => {
    const view = render(() => (
      <div class="lisca-instrument-shell">
        <PanelSection title="Framed section">Framed content</PanelSection>
        <PanelSection appearance="rail" description="Rail description" title="Rail section">
          Rail content
        </PanelSection>
      </div>
    ));

    const framedTrigger = view.getByRole("button", { name: "Framed section" });
    const railTrigger = view.getByRole("button", { name: "Rail section" });
    const framedSection = framedTrigger.closest("[data-section-appearance]");
    const railSection = railTrigger.closest("[data-section-appearance]");

    expect(framedSection?.getAttribute("data-section-appearance")).toBe("framed");
    expect(railSection?.getAttribute("data-section-appearance")).toBe("rail");
    expect(railSection?.classList.contains("py-2.5")).toBe(false);
    expect(railSection?.classList.contains("gap-2")).toBe(true);
    expect(railSection?.classList.contains("p-2.5")).toBe(false);
    expect(railSection?.querySelector('[data-slot="panel-header"]')?.className).not.toContain(
      "px-",
    );
    expect(railSection?.querySelector('[data-slot="panel-content"]')?.className).not.toContain(
      "px-",
    );
    expect(framedTrigger.classList.contains("leading-5")).toBe(false);
    expect(railTrigger.classList.contains("text-sm")).toBe(true);
    expect(railTrigger.classList.contains("leading-5")).toBe(true);
    expect(view.getByText("Rail section").getAttribute("data-slot")).toBe("section-title");
    expect(view.getByText("Rail description").classList.contains("text-xs")).toBe(true);
    expect(view.getByText("Rail description").classList.contains("leading-4")).toBe(true);
    expect(view.getByText("Rail content")).toBeTruthy();

    fireEvent.click(railTrigger);

    expect(railTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(view.queryByText("Rail content")).toBeNull();
    expect(view.getByText("Framed content")).toBeTruthy();
  });
});
