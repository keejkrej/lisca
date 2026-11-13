import { CanvasToastStack, useCanvasTransientStatus } from "@lisca/instrument";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";
import { AppShell } from "@lisca/ui/shell";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createMemo, createSignal } from "solid-js";

import { StudioHelpUsView } from "../components/studio-help-us-view";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import {
  buildStudioFeedbackIssueUrl,
  formatStudioFeedbackMarkdown,
  readStudioFeedbackDraft,
  saveStudioFeedbackDraft,
} from "../state/studio-onboarding";

export const Route = createFileRoute("/help-us")({
  component: HelpUsPage,
});

function HelpUsPage() {
  const navigate = useNavigate();
  const initialDraft = readStudioFeedbackDraft();
  const [studyFocus, setStudyFocus] = createSignal(initialDraft.studyFocus);
  const [measurementsNeeded, setMeasurementsNeeded] = createSignal(initialDraft.measurementsNeeded);
  const [missingWorkflow, setMissingWorkflow] = createSignal(initialDraft.missingWorkflow);
  const [contact, setContact] = createSignal(initialDraft.contact);
  const [savedAt, setSavedAt] = createSignal<string | null>(initialDraft.updatedAt);
  const [copied, setCopied] = createSignal(false);
  const [statusMessage, setStatusMessage] = createSignal<string | null>(null);

  const visibleStatus = useCanvasTransientStatus(statusMessage);
  const toasts = createMemo(() => {
    const message = visibleStatus();
    if (!message) return [];
    return [
      {
        text: message,
        tone: message.startsWith("Could not") ? ("error" as const) : undefined,
      },
    ];
  });

  const currentPayload = () => ({
    studyFocus: studyFocus(),
    measurementsNeeded: measurementsNeeded(),
    missingWorkflow: missingWorkflow(),
    contact: contact(),
  });

  const persistDraft = () => {
    const saved = saveStudioFeedbackDraft(currentPayload());
    setSavedAt(saved.updatedAt);
    setStatusMessage("Saved feedback draft locally.");
    return saved;
  };

  const copySummary = async () => {
    persistDraft();
    const markdown = formatStudioFeedbackMarkdown(currentPayload());
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setStatusMessage("Copied feedback summary to clipboard.");
      globalThis.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setStatusMessage("Could not copy summary to clipboard.");
    }
  };

  const openGitHubIssue = () => {
    persistDraft();
    const url = buildStudioFeedbackIssueUrl(currentPayload());
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const backToAssays = () => {
    void navigate({ to: "/assay" });
  };

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-rail">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.TopBar>
            <StudioTopBar />
          </AppShell.TopBar>
          <AppShell.Main>
            <CanvasToastStack messages={toasts()} />
            <AppShell.MainScroll contentClass="max-w-[52rem] items-center px-4 py-6 md:px-12 md:py-10">
              <StudioHelpUsView
                contact={contact()}
                copied={copied()}
                measurementsNeeded={measurementsNeeded()}
                missingWorkflow={missingWorkflow()}
                savedAt={savedAt()}
                studyFocus={studyFocus()}
                onBackToAssays={backToAssays}
                onChangeContact={setContact}
                onChangeMeasurementsNeeded={setMeasurementsNeeded}
                onChangeMissingWorkflow={setMissingWorkflow}
                onChangeStudyFocus={setStudyFocus}
                onCopySummary={() => void copySummary()}
                onOpenGitHubIssue={openGitHubIssue}
                onSaveDraft={persistDraft}
              />
            </AppShell.MainScroll>
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-rail">
          <StudioRightPanel>
            <PanelSection appearance="rail" title="Action">
              <RailControlStack>
                <Button
                  class="w-full justify-center"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={persistDraft}
                >
                  Save
                </Button>
                <Button
                  class="w-full justify-center"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => void copySummary()}
                >
                  {copied() ? "Copied" : "Copy summary"}
                </Button>
                <Button
                  class="w-full justify-center"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={openGitHubIssue}
                >
                  Open GitHub issue
                </Button>
                <Button
                  class="w-full justify-center"
                  size="sm"
                  type="button"
                  onClick={backToAssays}
                >
                  Continue
                </Button>
              </RailControlStack>
            </PanelSection>
          </StudioRightPanel>
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}
