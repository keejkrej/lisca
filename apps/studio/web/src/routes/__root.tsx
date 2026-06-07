import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";

import { StudioBasicInfoLeaveGuard } from "../components/studio-basic-info-leave-guard";
import { StudioRouteTransition } from "../components/studio-route-transition";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <>
      <StudioBasicInfoLeaveGuard />
      <StudioRouteTransition>
        <Outlet />
      </StudioRouteTransition>
    </>
  );
}

function NotFound() {
  return <Navigate replace to="/assay" />;
}
