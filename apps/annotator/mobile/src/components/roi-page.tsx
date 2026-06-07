import {
  AppShell,
  Button,
  ContrastControl,
  HostFilePickerDialog,
  Panel,
  Section,
  ShellNavbar,
  ViewportCard,
  AnnotationCanvas,
} from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import { annotatorHostOperations } from "../api/annotator-port";
import { useRoiPageState } from "../state/use-roi-page-state";

export function RoiPage() {
  const page = useRoiPageState();

  return (
    <AppShell>
      <AppShell.Header>
        <ShellNavbar
          routeItems={[{ value: "annotate", label: "Annotate" }]}
          routeValue="annotate"
          onPickWorkspace={() => page.setFilePickerOpen(true)}
          onPickSource={() => undefined}
          onRouteChange={() => undefined}
        />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left>
          <View style={styles.rail}>
            <Panel title="Workspace">
              <Text numberOfLines={2}>{page.workspacePath ?? "Not selected"}</Text>
            </Panel>
            <ContrastControl
              disabled={!page.frame}
              domainMin={page.contrastDomain.min}
              domainMax={page.contrastDomain.max}
              minValue={page.contrastMin}
              maxValue={page.contrastMax}
              onAutoRange={() => page.setContrast(null)}
              onMinCommit={(min) => page.setContrast({ min, max: page.contrastMax })}
              onMaxCommit={(max) => page.setContrast({ min: page.contrastMin, max })}
            />
          </View>
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <ViewportCard>
              <AnnotationCanvas
                frame={page.frame}
                labels={page.labels}
                mask={page.annotation.current.mask}
                activeLabelId={page.activeLabelId}
                tool={page.tool}
                brushSize={page.brushSize}
                overlayOpacity={page.overlayOpacity}
                toasts={page.canvasToasts}
                disabled={!page.canEditSegmentation}
                onMaskCommit={(mask) =>
                  page.annotation.commit({
                    classificationLabelId: page.annotation.current.classificationLabelId,
                    mask,
                  })
                }
              />
            </ViewportCard>
          </AppShell.Main>
          <AppShell.Dock>
            <View style={styles.dock}>
              <Section title="Mode">
                <View style={styles.row}>
                  <Button
                    label="Classification"
                    variant={page.mode === "classification" ? "default" : "outline"}
                    onPress={() => page.setMode("classification")}
                  />
                  <Button
                    label="Segmentation"
                    variant={page.mode === "segmentation" ? "default" : "outline"}
                    onPress={() => page.setMode("segmentation")}
                  />
                </View>
              </Section>
              <Section title="Save">
                <Button
                  label={page.saving ? "Saving..." : "Save annotation"}
                  disabled={!page.canSave || page.saving}
                  onPress={() => void page.handleSave()}
                />
              </Section>
            </View>
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right>
          <View style={styles.rail}>
            <Panel title="Labels">
              {page.labels.map((label) => (
                <Button
                  key={label.id}
                  label={label.name}
                  variant={page.activeLabelId === label.id ? "default" : "outline"}
                  onPress={() => page.setActiveLabelId(label.id)}
                />
              ))}
              <Button label="Create labels" variant="outline" onPress={() => page.setLabelDialogOpen(true)} />
            </Panel>
            {page.scanError ? <Text style={styles.error}>{page.scanError}</Text> : null}
            {page.frameError ? <Text style={styles.error}>{page.frameError}</Text> : null}
            {page.saveError ? <Text style={styles.error}>{page.saveError}</Text> : null}
          </View>
        </AppShell.Right>
      </AppShell.Body>

      <HostFilePickerDialog
        hostPort={annotatorHostOperations}
        mode="workspace"
        open={page.filePickerOpen}
        title="Workspace folder"
        onOpenChange={page.setFilePickerOpen}
        onPickDirectory={(path) => page.pickWorkspace(path)}
        onPickFile={() => undefined}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  rail: { flex: 1, gap: 8, padding: 12 },
  dock: { flex: 1, flexDirection: "row", gap: 12, padding: 12 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  error: { color: "#dc2626", fontSize: 12 },
});
