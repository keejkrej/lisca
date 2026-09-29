import { Navigate, Outlet, createRootRoute } from "@tanstack/solid-router";

import { StudioMetadataLeaveGuard } from "../components/studio-metadata-leave-guard";
import { StudioWorkSessionGate } from "../components/studio-work-session-gate";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <StudioWorkSessionGate>
      <StudioMetadataLeaveGuard />
      <Outlet />
    </StudioWorkSessionGate>
  );
}

function NotFound() {
  return <Navigate replace to="/assay" />;
}
