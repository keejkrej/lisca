import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { RegistryProvider } from "@effect/atom-solid";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/solid-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInitialStudioWizardState, studioWizardAtom } from "../src/state/studio-store";

// Real-router counterpart to the mocked-blocker suite (test A). Keeps the real
// `useBlocker`, real `studioWizardAtom` (seeded per-test via RegistryProvider),
// and real `isBasicInfoDirty`/`buildStudioAssayJsonFromWizard`/snapshot logic.
// Only the network + storage side-effects are mocked.
const save = vi.hoisted(() => ({
  assayJsonExists: vi.fn(async (_saveTo: string) => false),
  writeStudioAssayJson: vi.fn(async (_saveTo: string, _json: unknown) => undefined),
}));
const workSession = vi.hoisted(() => ({ touchStudioWorkSessionFromAssayPath: vi.fn() }));
const memory = vi.hoisted(() => ({ recordStudioAssayMemory: vi.fn() }));

vi.mock("../src/utils/save-studio-assay", () => ({
  assayJsonExists: save.assayJsonExists,
  writeStudioAssayJson: save.writeStudioAssayJson,
}));

vi.mock("../src/utils/studio-memory", () => ({
  recordStudioAssayMemory: memory.recordStudioAssayMemory,
}));

vi.mock("@lisca/client/session/work-session", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@lisca/client/session/work-session");
  return {
    ...actual,
    touchStudioWorkSessionFromAssayPath: workSession.touchStudioWorkSessionFromAssayPath,
  };
});

import { StudioBasicInfoLeaveGuard } from "../src/components/studio-basic-info-leave-guard";

type WizardState = ReturnType<typeof createInitialStudioWizardState>;

function dirtyWizard(overrides: Partial<WizardState> = {}): WizardState {
  return { ...createInitialStudioWizardState(), name: "A", ...overrides };
}

function InfoPage() {
  return <div>Info page</div>;
}

function AlignPage() {
  return <div>Align page</div>;
}

function renderWithRouter(initialWizard: WizardState) {
  const rootRoute = createRootRoute({
    component: function RootLayout() {
      return (
        <RegistryProvider initialValues={[[studioWizardAtom, initialWizard]]}>
          <StudioBasicInfoLeaveGuard />
          <Outlet />
        </RegistryProvider>
      );
    },
  });
  const infoRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/info",
    component: InfoPage,
  });
  const alignRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/align",
    component: AlignPage,
  });
  const routeTree = rootRoute.addChildren([infoRoute, alignRoute]);
  const history = createMemoryHistory({ initialEntries: ["/info"] });
  const router = createRouter({ routeTree, history });

  return { router, ...render(() => <RouterProvider router={router} />) };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  save.assayJsonExists.mockResolvedValue(false);
  save.writeStudioAssayJson.mockResolvedValue(undefined);
});

// jsdom doesn't implement window.scrollTo, which @tanstack/router-core's scroll
// restoration calls on navigation. Stub it (same as studio-nav-rail.test.tsx).
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("StudioBasicInfoLeaveGuard real-router integration", () => {
  it("parks navigation and surfaces the workspace-folder error when Save is clicked without a folder", async () => {
    const { router } = renderWithRouter(dirtyWizard({ workspacePath: "" }));

    // Wait for the initial route to render so the guard's `useBlocker` effect
    // has registered `history.block` (createEffect runs after render).
    await screen.findByText("Info page");

    // Do not await navigate: a blocked navigation doesn't settle until the
    // blocker proceeds/resets. Fire it and wait for the modal instead.
    void router.navigate({ to: "/align" });

    await screen.findByRole("dialog", { name: "Info changed" });
    // The real @tanstack/solid-router blocker kept us on /info.
    expect(router.state.location.href).toBe("/info");

    await fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Pick a workspace folder before saving/i);

    // Navigation is still parked after the failed save — the fix surfaces an
    // error instead of silently returning false, and the route does not advance.
    expect(router.state.location.href).toBe("/info");
    expect(save.writeStudioAssayJson).not.toHaveBeenCalled();
    expect(save.assayJsonExists).not.toHaveBeenCalled();
    // The skip/escape hatch still resolves the parked blocker.
    await fireEvent.click(screen.getByRole("button", { name: "Skip Save" }));
    await waitFor(() => expect(router.state.location.href).toBe("/align"));
  });

  it("advances navigation after a successful save on a dirty wizard with a workspace folder", async () => {
    const { router } = renderWithRouter(dirtyWizard({ workspacePath: "/ws/run-1" }));

    await screen.findByText("Info page");

    void router.navigate({ to: "/align" });

    await screen.findByRole("dialog", { name: "Info changed" });
    expect(router.state.location.href).toBe("/info");

    await fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(save.writeStudioAssayJson).toHaveBeenCalled();
      expect(router.state.location.href).toBe("/align");
    });

    expect(save.assayJsonExists).toHaveBeenCalledWith("/ws/run-1");
    expect(save.writeStudioAssayJson).toHaveBeenCalledWith("/ws/run-1", expect.anything());
  });
});
