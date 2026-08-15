import type { Component } from "solid-js";

export function DemoRoutePage(props: { Demo: Component }) {
  return (
    <div class="h-dvh">
      <props.Demo />
    </div>
  );
}
