import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import { ConnectionStatus, type ConnectionState } from "../src/shell/chrome/connection-status";

afterEach(cleanup);

const states = [
  ["idle", "Idle"],
  ["connecting", "Connecting…"],
  ["open", "Connected"],
  ["closed", "Disconnected"],
] satisfies [ConnectionState, string][];

describe("ConnectionStatus", () => {
  it.each(states)("renders the %s host state without visible service chrome", (state, label) => {
    const view = render(() => (
      <ConnectionStatus httpBaseUrl="http://127.0.0.1:8767" state={state} />
    ));
    const status = view.getByLabelText(`Server ${label}`);

    expect(status.textContent).toBe(label);
    expect(status.dataset.state).toBe(state);
    expect(status.querySelector('[data-slot="connection-status-dot"]')).not.toBeNull();
  });
});
