import IconCheckRegular from "phosphor-icons-solid/IconCheckRegular";
import { Show } from "solid-js";

/** Persistent affordance that distinguishes a stateful rail toggle from an ordinary action. */
export function AlignStateToggleIndicator(props: { pressed: boolean }) {
  return (
    <span
      aria-hidden="true"
      class="lisca-instrument-toggle-indicator hidden size-3.5 shrink-0 items-center justify-center rounded-full border border-current"
      data-slot="instrument-toggle-indicator"
      data-state={props.pressed ? "on" : "off"}
    >
      <Show when={props.pressed}>
        <IconCheckRegular class="size-2.5" />
      </Show>
    </span>
  );
}
