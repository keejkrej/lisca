import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return <Outlet />;
}

function NotFound() {
  return <Navigate replace to="/assay" />;
}
