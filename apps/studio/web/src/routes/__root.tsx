import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";

import { StudioBasicInfoLeaveGuard } from "../components/studio-basic-info-leave-guard";
import { StudioProfileProvider } from "../components/studio-profile-provider";
import { StudioWorkSessionGate } from "../components/studio-work-session-gate";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <StudioProfileProvider>
      <StudioWorkSessionGate>
        <StudioBasicInfoLeaveGuard />
        <Outlet />
      </StudioWorkSessionGate>
    </StudioProfileProvider>
  );
}

function NotFound() {
  return <Navigate replace to="/assay" />;
}
