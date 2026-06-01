import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";

import { StudioBasicInfoLeaveGuard } from "../components/studio-basic-info-leave-guard";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <>
      <StudioBasicInfoLeaveGuard />
      <Outlet />
    </>
  );
}

function NotFound() {
  return <Navigate replace to="/assay" />;
}
