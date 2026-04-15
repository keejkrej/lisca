import { Button } from "lisca/viewer/ui";

import { SidebarSection } from "../../../../viewer/react/app/sidebar";
import { useRoiAnnotationContext } from "../RoiAnnotationContext";
import { AnnotationLabelSelectTile } from "./AnnotationLabelTile";

export default function AnnotationToolbarLabels() {
  const {
    localLabels,
    labelManagerOpenable,
    setLabelManagerOpen,
    setLabelSaveState,
    annotationMode,
    currentSnapshot,
    activePaintLabelId,
    handleClassificationChange,
    setActivePaintLabelId,
    canEditClassification,
    canEdit,
    loading,
  } = useRoiAnnotationContext();

  return (
    <SidebarSection
      title="Labels"
      action={
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          disabled={!labelManagerOpenable}
          title={!labelManagerOpenable ? "Open a workspace first" : undefined}
          onClick={() => {
            setLabelSaveState({ saving: false, error: null });
            setLabelManagerOpen(true);
          }}
        >
          Configure
        </Button>
      }
    >
      {localLabels.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {localLabels.map((label) => {
            const selected =
              annotationMode === "classification"
                ? currentSnapshot.classificationLabelId === label.id
                : activePaintLabelId === label.id;

            const disabled =
              loading ||
              (annotationMode === "classification"
                ? !canEditClassification
                : !canEdit);

            const onClick =
              annotationMode === "classification"
                ? () => handleClassificationChange(label.id)
                : () => setActivePaintLabelId(label.id);

            return (
              <AnnotationLabelSelectTile
                key={label.id}
                label={label}
                selected={selected}
                disabled={disabled}
                onClick={onClick}
              />
            );
          })}
        </div>
      ) : null}
    </SidebarSection>
  );
}
