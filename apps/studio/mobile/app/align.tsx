import {
  AppShell,
  AlignCanvas,
  ViewportCard,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
  cursorForAlignTool,
  Button,
  Section,
} from "@lisca/ui-native";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { StudioNavRail } from "../src/components/studio-nav-rail";
import { useStudioAlignState } from "../src/state/use-studio-align-state";

export default function AlignRoute() {
  const router = useRouter();
  const state = useStudioAlignState();
  const handlers = useAlignCanvasGridHandlers({
    disabled: state.cropping,
    grid: state.grid,
    patternZoomLocked: state.patternZoomLocked,
    setGrid: state.setGrid,
    toolMode: state.toolMode,
  });
  const visibleStatus = useCanvasTransientStatus(state.status);
  const toasts = useMemo(() => {
    if (state.error) return [{ text: state.error, tone: "error" as const }];
    if (visibleStatus) return [{ text: visibleStatus }];
    return [];
  }, [state.error, visibleStatus]);

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={96}>
          <StudioNavRail />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <ViewportCard>
              <AlignCanvas
                frame={state.frame}
                grid={state.grid}
                previewGrid={handlers.previewGrid}
                excludedCells={state.displayedExcludedCells}
                loading={state.scanLoading || state.frameLoading}
                toasts={toasts}
                cursor={cursorForAlignTool(state.toolMode, state.grid.enabled, handlers.previewGrid != null)}
                onVirtualPointerDown={handlers.handlePointerDown}
                onVirtualPointerMove={handlers.handlePointerMove}
                onVirtualPointerUp={handlers.handlePointerEnd}
                onVirtualPointerCancel={handlers.handlePointerEnd}
              />
            </ViewportCard>
          </AppShell.Main>
          <AppShell.Dock>
            <View style={styles.dock}>
              <Section title="Studio align">
                <Button label="Continue to annotate" onPress={() => router.push("/annotate")} />
                <Button label="Save bbox" variant="outline" onPress={() => void state.saveAndAdvance()} />
              </Section>
            </View>
          </AppShell.Dock>
        </AppShell.MainColumn>
      </AppShell.Body>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  dock: { padding: 12 },
});
