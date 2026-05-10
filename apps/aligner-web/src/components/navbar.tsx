import { ShellNavbar } from "@lisca/ui";
import { useNavigate } from "@tanstack/react-router";

import type { RouteId } from "../types";

export function Navbar(props: { routeId: RouteId }) {
  const navigate = useNavigate();

  return (
    <ShellNavbar
      wsDefaultPort={8765}
      routeItems={[
        { value: "align", label: "Align" },
      ]}
      showRouteToggle={false}
      routeValue={props.routeId}
      onRouteChange={(v: string) => navigate({ to: `/${v}` })}
    />
  );
}
