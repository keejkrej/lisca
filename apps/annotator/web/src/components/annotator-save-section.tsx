import { Button } from "@lisca/ui/components";
import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";

import { annotationOutputPaths } from "../utils/annotation-output";
import { useAnnotateDock } from "../state/annotate-page-selectors";

export function AnnotatorSaveSection() {
  const dock = useAnnotateDock();
  const paths = annotationOutputPaths(dock.request, dock.mode);

  return (
    <DockSection title="Save">
      <div className="flex w-full flex-col gap-2">
        {paths.length > 1 ? (
          <div className="grid w-full grid-cols-2 gap-2">
            {paths.map((path) => (
              <div key={path} className="min-w-0">
                <ReadonlyPathField aria-label={`Output path ${path}`} value={path} />
              </div>
            ))}
          </div>
        ) : (
          paths.map((path) => (
            <ReadonlyPathField key={path} aria-label={`Output path ${path}`} value={path} />
          ))
        )}
        {paths.length > 1 ? (
          <div className="grid w-full grid-cols-2 gap-2">
            <div className="col-span-2 min-w-0">
              <Button
                className="w-full justify-center"
                disabled={!dock.canSave}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => void dock.handleSave()}
              >
                {dock.saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="w-full justify-center"
            disabled={!dock.canSave}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void dock.handleSave()}
          >
            {dock.saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
    </DockSection>
  );
}
