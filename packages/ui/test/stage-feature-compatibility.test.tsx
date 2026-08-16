import { cleanup, fireEvent, render, screen, within } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AlignToolToolbar } from "../src/features/align/align-tools";
import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
} from "../src/features/annotate/annotation-tool-grid";
import { PathButton } from "../src/shell/chrome/path-button";

vi.mock("@lisca/ui/components", () => import("../src/components/ui/button"));
vi.mock("@lisca/ui/shell", () => import("@lisca/ui-headless/dock"));

vi.mock("phosphor-icons-solid/IconCaretDownRegular", () => ({
  default: () => <svg aria-hidden="true" />,
}));
vi.mock("phosphor-icons-solid/IconCaretLeftRegular", () => ({
  default: () => <svg aria-hidden="true" />,
}));
vi.mock("phosphor-icons-solid/IconCaretRightRegular", () => ({
  default: () => <svg aria-hidden="true" />,
}));
vi.mock("phosphor-icons-solid/IconCaretUpRegular", () => ({
  default: () => <svg aria-hidden="true" />,
}));
vi.mock("phosphor-icons-solid/IconLassoRegular", () => ({
  default: () => <svg aria-hidden="true" />,
}));
vi.mock("phosphor-icons-solid/IconMagnifyingGlassRegular", () => ({
  default: () => <svg aria-hidden="true" data-testid="magnifier-icon" />,
}));
vi.mock("phosphor-icons-solid/IconLockOpenRegular", () => ({
  default: () => <svg aria-hidden="true" data-testid="lock-open-icon" />,
}));
vi.mock("phosphor-icons-solid/IconLockRegular", () => ({
  default: () => <svg aria-hidden="true" data-testid="lock-icon" />,
}));
vi.mock("phosphor-icons-solid/IconPaintBrushRegular", () => ({
  default: () => <svg aria-hidden="true" />,
}));
vi.mock("phosphor-icons-solid/IconSparkleRegular", () => ({
  default: () => <svg aria-hidden="true" />,
}));

afterEach(cleanup);

describe("stage rail tool compatibility", () => {
  it("renders five align actions with Magnifier last and maps their displayed shortcuts", () => {
    const onModeChange = vi.fn();
    render(() => (
      <AlignToolToolbar layout="rail" mode="pan" shortcutsEnabled onModeChange={onModeChange} />
    ));

    const toolbar = screen.getByRole("toolbar", { name: "Align canvas tool" });
    const expected = [
      { key: "1", label: "Pan", mode: "pan" },
      { key: "2", label: "Rotate", mode: "rotate" },
      { key: "3", label: "Zoom spacing", mode: "zoom-spacing" },
      { key: "4", label: "Zoom pattern", mode: "zoom-pattern" },
      { key: "5", label: "Magnifier", mode: "magnifier" },
    ] as const;

    expect(toolbar.children).toHaveLength(5);
    for (const action of expected) {
      const button = within(toolbar).getByRole("button", {
        name: `${action.label} (${action.key})`,
      });
      expect(button.textContent).toContain(action.label);
      expect(button.querySelector("kbd")?.textContent).toBe(action.key);

      fireEvent.keyDown(window, { key: action.key });
      expect(onModeChange).toHaveBeenLastCalledWith(action.mode);
    }
    expect(onModeChange).toHaveBeenCalledTimes(5);
  });

  it("renders independent 32px spacing and pattern zoom locks", () => {
    const onSpacingZoomLockedChange = vi.fn();
    const onPatternZoomLockedChange = vi.fn();
    const rail = render(() => (
      <AlignToolToolbar
        layout="rail"
        mode="pan"
        patternZoomLocked={false}
        spacingZoomLocked
        onModeChange={() => undefined}
        onPatternZoomLockedChange={onPatternZoomLockedChange}
        onSpacingZoomLockedChange={onSpacingZoomLockedChange}
      />
    ));

    const spacingLock = screen.getByRole("button", { name: "Unlock spacing zoom" });
    const patternLock = screen.getByRole("button", { name: "Lock pattern zoom" });
    expect(spacingLock.className).toContain("size-8");
    expect(patternLock.className).toContain("size-8");
    expect(spacingLock.title).toBe("Unlock spacing zoom");
    expect(patternLock.title).toBe("Lock pattern zoom");
    expect(within(spacingLock).getByTestId("lock-icon")).toBeTruthy();
    expect(within(patternLock).getByTestId("lock-open-icon")).toBeTruthy();

    fireEvent.click(spacingLock);
    fireEvent.click(patternLock);
    expect(onSpacingZoomLockedChange).toHaveBeenCalledWith(false);
    expect(onPatternZoomLockedChange).toHaveBeenCalledWith(true);

    rail.unmount();
    render(() => (
      <AlignToolToolbar
        mode="pan"
        patternZoomLocked={false}
        spacingZoomLocked
        onModeChange={() => undefined}
        onPatternZoomLockedChange={onPatternZoomLockedChange}
        onSpacingZoomLockedChange={onSpacingZoomLockedChange}
      />
    ));
    expect(screen.getByRole("button", { name: "Unlock spacing zoom" }).className).toContain(
      "size-8",
    );
    expect(screen.getByRole("button", { name: "Lock pattern zoom" }).className).toContain("size-8");
  });

  it("shows Magnifier last as annotation shortcut 5 and retains all grid actions", () => {
    const actions = buildAnnotationToolActions("brush", vi.fn(), false);
    const rail = render(() => (
      <AnnotationToolGrid canEditTools layout="rail" shortcutsEnabled toolActions={actions} />
    ));

    const railToolbar = screen.getByRole("toolbar", { name: "Annotation tool" });
    expect(railToolbar.children).toHaveLength(5);
    for (const [index, label] of ["Brush", "Lasso", "Smart", "Erase", "Magnifier"].entries()) {
      const button = within(railToolbar).getByRole("button", {
        name: `${label} (${index + 1})`,
      });
      expect(button.querySelector("kbd")?.textContent).toBe(String(index + 1));
    }
    rail.unmount();

    render(() => <AnnotationToolGrid canEditTools toolActions={actions} />);
    const gridToolbar = screen.getByRole("toolbar", { name: "Annotation tool" });
    expect(within(gridToolbar).getAllByRole("button")).toHaveLength(7);
    expect(within(gridToolbar).getByRole("button", { name: "Brush (1)" })).toBeTruthy();
    expect(within(gridToolbar).getByRole("button", { name: "Smart Erase (6)" })).toBeTruthy();
    expect(
      within(within(gridToolbar).getByRole("button", { name: "Magnifier (7)" })).getByTestId(
        "magnifier-icon",
      ),
    ).toBeTruthy();
  });

  it("keeps Magnifier available when annotation editing actions are disabled", () => {
    const onToolChange = vi.fn();
    const actions = buildAnnotationToolActions("brush", onToolChange, true, { viewable: true });
    render(() => <AnnotationToolGrid canEditTools={false} layout="rail" toolActions={actions} />);

    expect((screen.getByRole("button", { name: "Brush (1)" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    const magnifier = screen.getByRole("button", { name: "Magnifier (5)" });
    expect((magnifier as HTMLButtonElement).disabled).toBe(false);
    fireEvent.keyDown(window, { key: "5" });
    expect(onToolChange).toHaveBeenLastCalledWith("magnifier");
    fireEvent.click(magnifier);
    expect(onToolChange).toHaveBeenCalledTimes(2);
  });
});

describe("PathButton stage compatibility", () => {
  it("shows the stage label and requested extension while preserving the classic icon basename", () => {
    render(() => (
      <div>
        <PathButton
          appearance="stage"
          icon={<svg data-testid="unused-stage-icon" />}
          label="Source"
          preserveExtension
          value="/workspaces/plate-01/source-image.nd2"
          onClick={() => undefined}
        />
        <PathButton
          icon={<svg aria-hidden="true" data-testid="classic-path-icon" />}
          label="Source"
          value="/workspaces/plate-01/source-image.nd2"
          onClick={() => undefined}
        />
      </div>
    ));

    const stage = screen.getByRole("button", { name: "Source source-image.nd2" });
    expect(stage.textContent).toContain("Source");
    expect(stage.textContent).toContain("source-image.nd2");
    expect(screen.queryByTestId("unused-stage-icon")).toBeNull();

    const classic = screen.getByRole("button", { name: "source-image" });
    expect(within(classic).getByTestId("classic-path-icon")).toBeTruthy();
    expect(classic.textContent).toBe("source-image");
    expect(classic.textContent).not.toContain(".nd2");
  });
});
