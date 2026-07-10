import { Navigate, Outlet, createRootRoute } from "@tanstack/solid-router";

import { StudioBasicInfoLeaveGuard } from "../components/studio-basic-info-leave-guard";
import { StudioWorkSessionGate } from "../components/studio-work-session-gate";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <StudioWorkSessionGate>
      <StudioBasicInfoLeaveGuard />
      <Outlet />
    </StudioWorkSessionGate>
  );
}

function NotFound() {
  return <Navigate replace to="/assay" />;
}