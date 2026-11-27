import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioCropStartModal } from "../src/components/studio-crop-start-modal";
import type { CropStartConfirmState } from "../src/state/use-studio-align-state";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

function findButton(root: ParentNode, name: string): HTMLButtonElement | null {
  return (
    (Array.from(root.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === name || btn.getAttribute("aria-label") === name,
    ) as HTMLButtonElement | undefined) ?? null
  );
}

async function mountModal(confirm: CropStartConfirmState | null) {
  const startConfirmedCrop = vi.fn();
  const cancelCropStartConfirm = vi.fn();
  const goToUnalignedPosition = vi.fn();

  const Msg = UiSchema.TaggedEnum({
    Cancel: {},
    Start: {},
    GoToUnaligned: {},
  });

  const Host = Html.component({
    name: "StudioCropStartModalHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Msg,
  }).make({
    init: () => ({}),
    update: {
      Cancel: ($) => {
        cancelCropStartConfirm();
        return $.model;
      },
      Start: ($) => {
        startConfirmedCrop();
        return $.model;
      },
      GoToUnaligned: ($) => {
        goToUnalignedPosition();
        return $.model;
      },
    },
    view: (h) =>
      h.div.children(
        StudioCropStartModal(h, {
          confirm,
          scan: null,
          onCancel: Msg.Cancel(),
          onStart: Msg.Start(),
          onGoToUnaligned: Msg.GoToUnaligned(),
        }),
      ),
  });

  const mounted = await mountTest(Host, {});
  return {
    ...mounted,
    startConfirmedCrop,
    cancelCropStartConfirm,
    goToUnalignedPosition,
  };
}

afterEach(async () => {
  await cleanupMounted();
  vi.clearAllMocks();
});

describe("StudioCropStartModal (Crop button)", () => {
  it("offers Start when every position is aligned", async () => {
    const { container, startConfirmedCrop } = await mountModal({
      positions: [0, 1, 2],
      unaligned: [],
    });

    expect(container.textContent).toContain("All positions aligned");
    const startButton = findButton(container, "Start");
    expect(startButton).not.toBeNull();
    clickElement(startButton!);
    await flushMicrotasks();
    expect(startConfirmedCrop).toHaveBeenCalledOnce();
  });

  it("lists unaligned positions and jumps to them instead of cropping", async () => {
    const { container, startConfirmedCrop, goToUnalignedPosition } = await mountModal({
      positions: [0, 1, 2, 3],
      unaligned: [1, 3],
    });

    expect(container.textContent).toContain("Not all positions aligned");
    expect(container.textContent).toMatch(/2 of 4 positions aligned.*Pos1, Pos3/);
    expect(findButton(container, "Start")).toBeNull();

    const goToUnaligned = findButton(container, "Go to unaligned");
    expect(goToUnaligned).not.toBeNull();
    clickElement(goToUnaligned!);
    await flushMicrotasks();
    expect(goToUnalignedPosition).toHaveBeenCalledOnce();
    expect(startConfirmedCrop).not.toHaveBeenCalled();
  });
});
