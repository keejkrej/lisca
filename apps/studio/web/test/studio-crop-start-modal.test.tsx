import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const state = vi.hoisted(() => ({
  cropStartConfirm: null as null | { positions: number[]; unaligned: number[] },
  startConfirmedCrop: vi.fn(),
  cancelCropStartConfirm: vi.fn(),
  goToUnalignedPosition: vi.fn(),
}));

vi.mock("../src/state/studio-align-page-context", () => ({
  useStudioAlignPage: () => ({ state }),
}));

import { StudioCropStartModal } from "../src/components/studio-crop-start-modal";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StudioCropStartModal (Crop button)", () => {
  it("offers Start when every position is aligned", () => {
    state.cropStartConfirm = { positions: [0, 1, 2], unaligned: [] };
    render(() => <StudioCropStartModal />);

    expect(screen.getByText("All positions aligned")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(state.startConfirmedCrop).toHaveBeenCalledOnce();
  });

  it("lists unaligned positions and jumps to them instead of cropping", () => {
    state.cropStartConfirm = { positions: [0, 1, 2, 3], unaligned: [1, 3] };
    render(() => <StudioCropStartModal />);

    expect(screen.getByText("Not all positions aligned")).not.toBeNull();
    expect(screen.getByText(/2 of 4 positions aligned.*Pos1, Pos3/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Go to unaligned" }));
    expect(state.goToUnalignedPosition).toHaveBeenCalledOnce();
    expect(state.startConfirmedCrop).not.toHaveBeenCalled();
  });
});
