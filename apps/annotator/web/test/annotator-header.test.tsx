import { cleanup, render, screen } from "@solidjs/testing-library";
import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui/shell";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { AnnotatorAtomsProvider } from "../src/components/annotator-atoms-provider";
import { AnnotatorHeader } from "../src/components/annotator-header";
import { AnnotatePageProvider } from "../src/state/annotate-page-context";

function renderAnnotatorHeader() {
  return render(() => (
    <ShellThemeProvider appId="annotator">
      <ShellServerProvider probe={() => new Promise(() => undefined)}>
        <ShellWorkspaceProvider>
          <AnnotatorAtomsProvider>
            <AnnotatePageProvider>
              <AnnotatorHeader />
            </AnnotatePageProvider>
          </AnnotatorAtomsProvider>
        </ShellWorkspaceProvider>
      </ShellServerProvider>
    </ShellThemeProvider>
  ));
}

afterEach(() => {
  cleanup();
});

describe("AnnotatorHeader", () => {
  it("offers an outline workspace button and no task center", () => {
    renderAnnotatorHeader();

    const workspace = screen.getByRole("button", { name: "Workspace: not set" });
    expect(workspace.className).toContain("z-button-variant-outline");
    expect(screen.queryByRole("button", { name: /^Tasks/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Source/ })).toBeNull();
  });
});
