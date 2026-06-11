import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";

import { StudioBasicInfoLeaveGuard } from "../components/studio-basic-info-leave-guard";
import { StudioProfileProvider } from "../components/studio-profile-provider";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <StudioProfileProvider>
      <StudioBasicInfoLeaveGuard />
      <Outlet />
    </StudioProfileProvider>
  );
}

function NotFound() {
  return <Navigate replace to="/assay" />;
}
