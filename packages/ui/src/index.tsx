import type { ReactNode } from "react";

export function AppShell(props: { title: string; children: ReactNode }) {
  return (
    <div style={{ fontFamily: "system-ui", padding: "1.5rem", maxWidth: 960 }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.25rem", margin: 0 }}>{props.title}</h1>
      </header>
      <main>{props.children}</main>
    </div>
  );
}
