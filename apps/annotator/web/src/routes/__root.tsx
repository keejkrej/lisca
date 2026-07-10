import { createRootRoute, Navigate, Outlet } from "@tanstack/solid-router";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return <Outlet />;
}

function NotFound() {
  return <Navigate replace to="/" />;
}